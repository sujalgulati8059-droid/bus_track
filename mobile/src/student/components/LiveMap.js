import React, { useEffect, useMemo, useRef, useState, Component } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { stopCoords, CU_CENTER } from '../utils/stopCoords';

import { SERVER_URL } from '../../config';

const MAP_ORIGIN = /^https:\/\//.test(SERVER_URL) ? SERVER_URL : 'https://cu-bus-tracker.onrender.com';

// Tile providers, tried in order. CARTO's free raster tiles now show an "API key required"
// watermark, so use OpenStreetMap first and Esri as automatic fallback (both key-free).
const TILE_PROVIDERS = [
  { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 },
  { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri', maxZoom: 19 },
];

function buildHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" onerror="this.onerror=null;this.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';" />
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #eef2f7;
      overflow: hidden;
      -webkit-user-select: none;
      user-select: none;
    }
    #map {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #eef2f7;
    }
    .cu-badge {
      background: #0f172a;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 14px;
      font: 700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      border: 2px solid #facc15;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .bus-marker {
      transition: transform 0.6s linear;
    }
    .bus-container {
      position: relative;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .bus-body {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 2.5px solid #ffffff;
      color: #ffffff;
      font: 800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      position: relative;
    }
    .bus-body.live {
      border-color: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.45), 0 3px 8px rgba(0,0,0,0.35);
    }
    .bus-body.offline {
      border-color: #94a3b8;
      filter: grayscale(60%);
      opacity: 0.85;
    }
    .heading-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .heading-pointer {
      position: absolute;
      top: -7px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 7px solid #16a34a;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <script>
    if (typeof L === 'undefined') {
      var _s = document.createElement('script');
      _s.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js';
      document.head.appendChild(_s);
    }
  </script>
  <script>
    var mapReady = false;
    var map = null;
    var buses = {};
    var routeLayers = [];
    var routeKey = null;
    var readyRetries = 0;

    function postToRN(obj) {
      var msg = JSON.stringify(obj);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
        return true;
      }
      if (window.parent && window.parent.postMessage) {
        window.parent.postMessage(msg, '*');
        return true;
      }
      return false;
    }

    function notifyReady() {
      if (postToRN({ type: 'READY' })) {
        return;
      }
      if (readyRetries++ < 35) {
        setTimeout(notifyReady, 100);
      }
    }

    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
      });
    }

    function initMap() {
      try {
        if (typeof L === 'undefined') {
          if (readyRetries++ < 50) {
            setTimeout(initMap, 100);
          } else {
            postToRN({ type: 'ERROR', error: 'Leaflet failed to load from CDN' });
          }
          return;
        }

        map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([${CU_CENTER[0]}, ${CU_CENTER[1]}], 11);

        var PROVIDERS = ${JSON.stringify(TILE_PROVIDERS)};
        var providerIdx = 0, tileErrors = 0, tiles = null;
        function useProvider(i) {
          if (tiles) { map.removeLayer(tiles); }
          var p = PROVIDERS[i];
          tileErrors = 0;
          tiles = L.tileLayer(p.url, { maxZoom: p.maxZoom, attribution: p.attribution });
          tiles.on('tileerror', function() {
            tileErrors++;
            if (tileErrors >= 4 && providerIdx < PROVIDERS.length - 1) {
              providerIdx++;
              postToRN({ type: 'LOG', msg: 'Tile provider failed, switching to #' + providerIdx });
              useProvider(providerIdx);
            }
          });
          tiles.addTo(map);
        }
        useProvider(0);

        // CU Campus Hub Marker
        L.marker([${CU_CENTER[0]}, ${CU_CENTER[1]}], {
          icon: L.divIcon({
            className: '',
            html: '<div class="cu-badge">CU Campus</div>',
            iconAnchor: [40, 12]
          })
        }).addTo(map);

        mapReady = true;

        setTimeout(function() { if (map) map.invalidateSize(); }, 200);
        setTimeout(function() { if (map) map.invalidateSize(); }, 600);

        notifyReady();

        if (window._pendingUpdate) {
          window.update(window._pendingUpdate);
          window._pendingUpdate = null;
        }
      } catch (err) {
        postToRN({ type: 'ERROR', error: err.message });
      }
    }

    function busIcon(b) {
      var hasHeading = b.heading != null && !isNaN(b.heading);
      var headingDeg = hasHeading ? b.heading : 0;
      var headingPointerHtml = hasHeading
        ? '<div class="heading-wrapper" style="transform: rotate(' + headingDeg + 'deg);"><div class="heading-pointer"></div></div>'
        : '';
      var liveClass = b.live ? 'live' : 'offline';
      var bg = esc(b.color || '#a16207');
      var label = esc(b.routeNo || 'B');

      return L.divIcon({
        className: 'bus-marker',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        html: '<div class="bus-container">' +
                '<div class="bus-body ' + liveClass + '" style="background:' + bg + '">' +
                  headingPointerHtml +
                  '<span>' + label + '</span>' +
                '</div>' +
              '</div>'
      });
    }

    function busPopup(b) {
      var speedText = (b.speed != null && b.speed > 0) ? '<br>Speed: <b>' + Math.round(b.speed) + ' km/h</b>' : '';
      var etaText = (b.etaMinutes != null) ? '<br>ETA: <b>' + b.etaMinutes + ' min</b>' : '';
      return '<b>Route ' + esc(b.routeNo) + '</b>' +
        (b.live ? ' <span style="color:#16a34a;font-weight:bold">● LIVE</span>' : ' <span style="color:#64748b">Offline</span>') +
        (b.routeName ? '<br><small>' + esc(b.routeName) + '</small>' : '') +
        '<br>Current: <b>' + esc(b.currentStop || '-') + '</b>' +
        '<br>Next: <b>' + esc(b.nextStop || 'Terminus') + '</b>' +
        speedText + etaText;
    }

    window.update = function(p) {
      if (!p) return;
      if (!mapReady || !map) {
        window._pendingUpdate = p;
        return;
      }

      try {
        var seen = {};
        (p.buses || []).forEach(function(b) {
          if (!b || typeof b.lat !== 'number' || typeof b.lng !== 'number' || isNaN(b.lat) || isNaN(b.lng)) {
            return;
          }
          seen[b.routeNo] = 1;
          var ll = [b.lat, b.lng];
          if (buses[b.routeNo]) {
            buses[b.routeNo].setLatLng(ll).setIcon(busIcon(b)).setPopupContent(busPopup(b));
          } else {
            buses[b.routeNo] = L.marker(ll, { icon: busIcon(b) }).bindPopup(busPopup(b)).addTo(map);
          }
        });

        Object.keys(buses).forEach(function(k) {
          if (!seen[k]) {
            map.removeLayer(buses[k]);
            delete buses[k];
          }
        });

        var key = p.route ? p.route.key : null;
        if (key !== routeKey) {
          routeLayers.forEach(function(l) { map.removeLayer(l); });
          routeLayers = [];
          routeKey = key;

          if (p.route && p.route.points && p.route.points.length) {
            var validPoints = [];
            var validStops = [];
            for (var i = 0; i < p.route.points.length; i++) {
              var pt = p.route.points[i];
              if (pt && Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1])) {
                validPoints.push(pt);
                validStops.push(p.route.stops ? p.route.stops[i] : ('Stop ' + (i + 1)));
              }
            }

            if (validPoints.length > 0) {
              var line = L.polyline(validPoints, {
                color: p.route.color || '#a16207',
                weight: 4,
                opacity: 0.85
              }).addTo(map);
              routeLayers.push(line);

              var myStopsList = p.myStops && p.myStops.length ? p.myStops : (p.myStop ? [p.myStop] : []);

              validPoints.forEach(function(pt, i) {
                var stopName = validStops[i];
                var isMine = myStopsList.indexOf(stopName) !== -1;
                var circle = L.circleMarker(pt, {
                  radius: isMine ? 9 : 5,
                  color: '#ffffff',
                  weight: isMine ? 3 : 2,
                  fillColor: isMine ? '#2563eb' : (p.route.color || '#a16207'),
                  fillOpacity: 1
                }).bindPopup(
                  '<b>' + esc(stopName) + '</b>' +
                  (isMine ? '<br><span style="color:#2563eb;font-weight:bold">★ Your Boarding Stop</span>' : '')
                ).addTo(map);
                routeLayers.push(circle);
              });

              try {
                map.fitBounds(line.getBounds(), { padding: [40, 40] });
              } catch(e) {}
            }
          }
        }
      } catch (err) {
        postToRN({ type: 'ERROR', error: err.message });
      }
    };

    window.recenter = function() {
      if (map) {
        map.flyTo([${CU_CENTER[0]}, ${CU_CENTER[1]}], 12);
      }
    };

    window.addEventListener('message', function(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'recenter') window.recenter();
        if (msg.type === 'update') window.update(msg.payload);
      } catch (e) {}
    });
    document.addEventListener('message', function(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'recenter') window.recenter();
        if (msg.type === 'update') window.update(msg.payload);
      } catch (e) {}
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initMap();
    } else {
      document.addEventListener('DOMContentLoaded', initMap);
    }
  </script>
</body>
</html>`;
}

const HTML = buildHtml();

class MapErrorBoundary extends Component {
  state = { crashed: false, errorMessage: '' };
  static getDerivedStateFromError(error) {
    return { crashed: true, errorMessage: error ? error.message : 'Unknown error' };
  }
  componentDidCatch(error, info) {
    console.warn('Map ErrorBoundary caught error:', error, info);
  }
  render() {
    if (this.state.crashed) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Map failed to render</Text>
          <Text style={styles.errorMsg}>{this.state.errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              this.setState({ crashed: false, errorMessage: '' });
              if (this.props.onRetry) this.props.onRetry();
            }}
          >
            <Text style={styles.retryBtnText}>Reload Map</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function LiveMap({ buses, route, myStop, myStops }) {
  const webRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const routePayload = useMemo(() => {
    if (!route || !route.stops?.length) return null;
    return {
      key: `${route.routeNo}:${route.stops.length}`,
      color: route.color,
      stops: route.stops,
      points: route.stops.map((s) => stopCoords(s)),
    };
  }, [route]);

  // Sync buses & route to WebView whenever map is ready or props change
  useEffect(() => {
    if (!mapReady || !webRef.current) return;
    const stopsList = myStops?.length ? myStops : myStop ? [myStop] : [];
    const payload = { buses, route: routePayload, myStop, myStops: stopsList };
    const jsCode = `if(window.update){window.update(${JSON.stringify(payload)});}true;`;
    webRef.current.injectJavaScript(jsCode);
  }, [mapReady, buses, routePayload, myStop, myStops]);

  // Safe timeout: if map hasn't reported ready within 8 seconds, reveal anyway or notify
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapReady) {
        setMapReady(true);
      }
    }, 7000);
    return () => clearTimeout(timer);
  }, [mapReady, reloadKey]);

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'READY') {
        setMapReady(true);
        setLoadError(null);
      } else if (data.type === 'ERROR') {
        console.warn('Map WebView error:', data.error);
      } else if (data.type === 'LOG') {
        console.log('Map:', data.msg);
      }
    } catch {}
  };

  const handleRetry = () => {
    setLoadError(null);
    setMapReady(false);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <MapErrorBoundary onRetry={handleRetry}>
      <View style={styles.wrap}>
        <WebView
          key={reloadKey}
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: HTML, baseUrl: MAP_ORIGIN }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          cacheEnabled={true}
          scalesPageToFit={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onLoadEnd={() => {
            // Fallback: if postMessage was delayed or dropped, mark ready after load
            setTimeout(() => setMapReady(true), 600);
          }}
          onError={(e) => {
            console.warn('WebView load error:', e.nativeEvent);
            setLoadError('Failed to load map assets');
          }}
          onHttpError={(e) => {
            console.warn('WebView HTTP error:', e.nativeEvent);
          }}
          onMessage={onMessage}
          style={styles.web}
        />

        {/* Loading Overlay */}
        {!mapReady && !loadError && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.loadingText}>Loading Map...</Text>
          </View>
        )}

        {/* Error Overlay */}
        {loadError && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>Could not load map</Text>
            <Text style={styles.errorMsg}>{loadError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recenter Button */}
        {mapReady && (
          <TouchableOpacity
            style={styles.recenterBtn}
            activeOpacity={0.8}
            onPress={() => {
              webRef.current?.injectJavaScript('if(window.recenter){window.recenter();}true;');
            }}
          >
            <Text style={styles.recenterText}>⊙</Text>
          </TouchableOpacity>
        )}
      </View>
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#eef2f7',
  },
  web: {
    flex: 1,
    backgroundColor: '#eef2f7',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#eef2f7',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#eef2f7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef2f7',
    padding: 20,
    gap: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  errorMsg: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    marginTop: 6,
  },
  retryBtnText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 13,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  recenterText: {
    fontSize: 22,
    color: '#0f172a',
    lineHeight: 24,
  },
});
