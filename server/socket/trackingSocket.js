const jwt = require("jsonwebtoken");
const Route = require("../models/Route");
const Driver = require("../models/Driver");
const BusStatus = require("../models/BusStatus");
const { notifyBusNear } = require("../services/pushService");

const CU = [30.7735, 76.5763];
const GPS = {
  "CU": [30.7735, 76.5763],
  "KHARAR BUS STAND": [30.7462, 76.6450],
  "SUNNY ENCLAVE": [30.7310, 76.6220],
  "NAV CITY": [30.7280, 76.6180],
  "KFC": [30.7350, 76.6280],
  "DERABASSI BUS STAND": [30.6020, 76.8030],
  "PHASE 7 MARKET": [30.7050, 76.7140],
  "PHASE 5 GURUDWARA": [30.7100, 76.7100],
  "CITY HEART": [30.7060, 76.7160],
  "SEC 17 BUS STAND": [30.7404, 76.7878],
  "SOHANA": [30.7160, 76.6890],
  "SOHANA BUS STAND": [30.7160, 76.6890],
  "LANDRAN": [30.8001, 76.5901],
  "KURALI BUS STAND": [30.8180, 76.5720],
  "MANSA DEVI": [30.7560, 76.8100],
  "IT PARK": [30.7300, 76.8050],
  "MANIMAJRA": [30.7260, 76.8420],
  "AIRPORT LIGHTS": [30.6730, 76.7880],
  "DHAKOLI": [30.7010, 76.7900],
  "VR MALL": [30.7480, 76.6420],
  "KALKA PUMP": [30.8400, 76.9550],
  "PINJORE BUS STAND": [30.7980, 76.9200],
  "PGI CHOWK": [30.7650, 76.7760],
  "OMAXE GATE": [30.8400, 76.5500],
  "WAVE ESTATE": [30.7500, 76.6200],
  "CTU BUS STAND": [30.7410, 76.7840],
  "RAM DARBAR": [30.7380, 76.7560],
  "ECO CITY": [30.8100, 76.7600],
  "GLOBAL ENCLAVE": [30.7510, 76.6360],
  "SANTEMAJRA": [30.7550, 76.6300],
};

const gc = (n) => {
  if (!n) return CU;
  const k = n.toUpperCase();
  if (GPS[k]) return GPS[k];
  const s = n.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const ang = ((s % 360) * Math.PI) / 180;
  const d = 0.04 + (s % 100) * 0.003;
  return [CU[0] + Math.cos(ang) * d, CU[1] + Math.sin(ang) * d];
};

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const hdg = (a, b) => ((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI + 360) % 360;

// Haversine distance in kilometers
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const LIVE_TIMEOUT = 30000; // 30s staleness timeout
const todayStr = () => new Date().toISOString().slice(0, 10);

module.exports = (io) => {
  const buses = new Map();
  const recentAlerts = new Map(); // key: `${routeNo}_${stop}`, value: timestamp

  const load = async () => {
    try {
      const routes = await Route.find({ isActive: true, routeNo: { $not: /-R$/ } }).lean();
      routes.forEach((r) => {
        if (!buses.has(r.routeNo)) {
          const s = gc(r.stops[0]);
          buses.set(r.routeNo, {
            routeNo: r.routeNo,
            routeName: r.routeName,
            stops: r.stops,
            lat: s[0],
            lng: s[1],
            lastKnown: { lat: s[0], lng: s[1] },
            stopIdx: 0,
            progress: 0,
            status: "parked",
            heading: 0,
            color: r.color || "#f97316",
            live: false,
            liveUpdatedAt: 0,
            tripActive: false,
            tripStartedAt: null,
            driverId: null,
            currentStop: r.stops[0] || null,
            nextStop: r.stops[1] || null,
          });
        }
      });
      console.log("Tracking " + buses.size + " buses");
    } catch (e) {
      console.error("Error loading routes for tracking:", e.message);
    }
  };

  const isLive = (b) => !!b.live && Date.now() - b.liveUpdatedAt < LIVE_TIMEOUT;

  // Check proximity to student stops (~500m) and trigger "bus-near" event + push notification
  const checkProximityAlerts = (b) => {
    if (!b.stops || !b.stops.length) return;
    for (const stop of b.stops) {
      const stopCoord = gc(stop);
      const distKm = haversineKm(b.lat, b.lng, stopCoord[0], stopCoord[1]);
      if (distKm <= 0.5) {
        // Within ~500m
        const alertKey = `${b.routeNo}_${stop}`;
        const lastAlert = recentAlerts.get(alertKey);
        // Alert at most once per 10 minutes per stop on this route
        if (!lastAlert || Date.now() - lastAlert > 10 * 60 * 1000) {
          recentAlerts.set(alertKey, Date.now());
          const distMeters = Math.round(distKm * 1000);
          const etaMins = Math.max(1, Math.round((distKm / 25) * 60));

          io.emit("bus-near", {
            routeNo: b.routeNo,
            stop,
            distanceMeters: distMeters,
            etaMinutes: etaMins,
          });

          // Send web push notification to subscribed users
          notifyBusNear(b.routeNo, stop, distMeters).catch(() => {});
        }
      }
    }
  };

  // Compute speed-based ETA (assuming avg 25 km/h in city traffic)
  const computeEta = (bus, stopName) => {
    if (!bus) return { live: false, etaMinutes: null, distanceKm: null };
    const live = isLive(bus);
    const stopCoord = gc(stopName);
    const distKm = haversineKm(bus.lat, bus.lng, stopCoord[0], stopCoord[1]);
    const etaMinutes = distKm < 0.2 ? 0 : Math.max(1, Math.round((distKm / 25) * 60));
    return {
      live,
      distanceKm: Number(distKm.toFixed(2)),
      distanceMeters: Math.round(distKm * 1000),
      etaMinutes: live ? etaMinutes : null,
      message: live
        ? etaMinutes === 0
          ? "Arriving now!"
          : `Arriving in ~${etaMinutes} min`
        : "Bus not live yet",
      lastKnown: bus.lastKnown || { lat: bus.lat, lng: bus.lng },
      lastUpdated: bus.liveUpdatedAt ? new Date(bus.liveUpdatedAt).toISOString() : null,
    };
  };

  const tick = () => {
    const allowSimulation = process.env.ALLOW_SIMULATION === "true";

    buses.forEach((b) => {
      // Check if GPS staleness expired
      if (b.live && !isLive(b)) {
        b.live = false;
        io.emit("bus-status", { routeNo: b.routeNo, live: false });
      }

      // If simulation is NOT allowed, never simulate bus movement
      if (!allowSimulation) {
        return;
      }

      // If simulation IS allowed, simulate movement for buses that are not live
      if (isLive(b)) return;

      if (b.stopIdx >= b.stops.length - 1) {
        b.status = "arrived";
        return;
      }
      b.status = "enroute";
      const cur = gc(b.stops[b.stopIdx]);
      const nxt = gc(b.stops[b.stopIdx + 1]);
      b.progress = Math.min(100, b.progress + 5 + (Date.now() % 5));
      const p = lerp(cur, nxt, b.progress / 100);
      b.lat = p[0];
      b.lng = p[1];
      b.lastKnown = { lat: p[0], lng: p[1] };
      b.heading = hdg(cur, nxt);
      if (b.progress >= 100) {
        b.stopIdx++;
        b.progress = 0;
      }
      b.currentStop = b.stops[b.stopIdx];
      b.nextStop = b.stops[b.stopIdx + 1] || null;
    });
  };

  const emit = () => {
    const data = Array.from(buses.values()).map((b) => {
      const live = isLive(b);
      const nextStopEta = b.nextStop ? computeEta(b, b.nextStop).etaMinutes : null;
      return {
        routeNo: b.routeNo,
        routeName: b.routeName,
        lat: b.lat,
        lng: b.lng,
        status: b.status,
        heading: b.heading,
        color: b.color,
        currentStop: b.currentStop,
        nextStop: b.nextStop,
        live,
        tripActive: !!b.tripActive,
        lastKnown: b.lastKnown || { lat: b.lat, lng: b.lng },
        lastUpdated: b.liveUpdatedAt ? new Date(b.liveUpdatedAt).toISOString() : null,
        etaMinutes: live ? nextStopEta : null,
      };
    });
    io.emit("bus-positions", data);
  };

  io.on("connection", (socket) => {
    socket.emit(
      "bus-positions",
      Array.from(buses.values()).map((b) => ({
        ...b,
        live: isLive(b),
        lastKnown: b.lastKnown || { lat: b.lat, lng: b.lng },
        lastUpdated: b.liveUpdatedAt ? new Date(b.liveUpdatedAt).toISOString() : null,
      }))
    );
    socket.emit("time-sync", { serverTime: new Date().toISOString() });
  });

  // Driver namespace: authenticated phones push real GPS pings here
  const driverNs = io.of("/driver");
  driverNs.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));
      const d = jwt.verify(token, process.env.JWT_SECRET);
      if (d.role !== "driver") return next(new Error("Invalid token"));
      const driver = await Driver.findById(d.id);
      if (!driver || !driver.isActive || driver.status === "pending" || driver.status === "rejected") {
        return next(new Error("Driver not found or not approved"));
      }
      socket.driver = driver;
      next();
    } catch (e) {
      next(new Error("Auth failed"));
    }
  });

  // Start trip for a route
  const startTrip = async (routeNo, driverId) => {
    const b = buses.get(routeNo);
    const now = new Date();
    if (b) {
      b.tripActive = true;
      b.tripStartedAt = now;
      b.driverId = driverId;
      b.status = "enroute";
    }
    try {
      await BusStatus.findOneAndUpdate(
        { routeNo, date: todayStr() },
        { isWorking: true, driver: driverId, startedAt: now, live: true },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (e) {
      console.error("Error updating BusStatus on trip start:", e.message);
    }
    io.emit("bus-status", { routeNo, live: true, status: "trip-started", startedAt: now });
    return { startedAt: now };
  };

  // Stop trip for a route
  const stopTrip = async (routeNo, driverId) => {
    const b = buses.get(routeNo);
    if (b) {
      b.tripActive = false;
      b.live = false;
      b.status = "parked";
      b.driverId = null;
    }
    try {
      await BusStatus.findOneAndUpdate(
        { routeNo, date: todayStr() },
        { live: false, stoppedAt: new Date() }
      );
    } catch (e) {
      console.error("Error updating BusStatus on trip stop:", e.message);
    }
    io.emit("bus-status", { routeNo, live: false, status: "trip-stopped" });
    return true;
  };

  // One place that applies a driver GPS ping (used by both the socket and REST endpoint).
  // Route is ALWAYS taken from the authenticated driver's routeNo — never from request body!
  // Location pings are accepted ONLY while a trip is active.
  const applyLocation = (routeNo, { lat, lng, heading }) => {
    if (typeof lat !== "number" || typeof lng !== "number") {
      return { ok: false, error: "lat and lng must be numbers" };
    }
    const b = buses.get(routeNo);
    if (!b) {
      return { ok: false, error: `Route ${routeNo} not found in tracking system` };
    }
    if (!b.tripActive) {
      return { ok: false, error: "Trip is not active. Please start trip first." };
    }

    b.lat = lat;
    b.lng = lng;
    b.lastKnown = { lat, lng };
    if (typeof heading === "number" && heading >= 0) b.heading = heading;
    b.status = "enroute";
    b.live = true;
    b.liveUpdatedAt = Date.now();
    b.currentStop = b.currentStop || b.stops[0];

    // Check proximity alerts to student stops
    checkProximityAlerts(b);

    return { ok: true };
  };

  const stopLive = (routeNo) => {
    const b = buses.get(routeNo);
    if (b) {
      b.live = false;
    }
    io.emit("bus-status", { routeNo, live: false });
  };

  const getEta = (routeNo, stopName) => {
    const b = buses.get(routeNo);
    if (!b) {
      return { live: false, etaMinutes: null, distanceKm: null, message: "Route not found" };
    }
    return computeEta(b, stopName);
  };

  const isTripActive = (routeNo) => {
    const b = buses.get(routeNo);
    return !!b && !!b.tripActive;
  };

  const getBusStatus = (routeNo) => {
    const b = buses.get(routeNo);
    if (!b) return null;
    return {
      routeNo: b.routeNo,
      live: isLive(b),
      tripActive: !!b.tripActive,
      lastKnown: b.lastKnown || { lat: b.lat, lng: b.lng },
      lastUpdated: b.liveUpdatedAt ? new Date(b.liveUpdatedAt).toISOString() : null,
    };
  };

  io.trackingApi = {
    applyLocation,
    stopLive,
    startTrip,
    stopTrip,
    isTripActive,
    getEta,
    getBusStatus,
  };

  driverNs.on("connection", (socket) => {
    // Route is strictly taken from authenticated socket.driver.routeNo — NEVER from client payload
    socket.on("location-update", ({ lat, lng, heading }) =>
      applyLocation(socket.driver.routeNo, { lat, lng, heading })
    );
    socket.on("trip-start", async () => await startTrip(socket.driver.routeNo, socket.driver._id));
    socket.on("trip-stop", async () => await stopTrip(socket.driver.routeNo, socket.driver._id));
    socket.on("disconnect", () => stopLive(socket.driver.routeNo));
  });

  load().then(() => {
    setInterval(() => {
      tick();
      emit();
    }, 3000);
    setInterval(
      () => io.emit("time-sync", { serverTime: new Date().toISOString() }),
      60000
    );
  });
};
