require("dotenv").config();
const mongoose = require("mongoose");
const Driver = require("../models/Driver");
const Route = require("../models/Route");

const DRIVERS_DATA = [
  { s_no: 1, route_no: "R-01", station: "Ambala Cantt - Defence Colony", bus_no: "PB65AV9399", driver_name: "Varinder Singh", mobile: "82953-49280", start_time: "06:40", parking: "Vendor Bus" },
  { s_no: 2, route_no: "R-02", station: "Ambala Cantt - DAV School", bus_no: "PB11-DB-2694", driver_name: "Chanchal Kumar", mobile: "95182-40119", start_time: "06:50", parking: "Vendor Bus" },
  { s_no: 3, route_no: "R-03", station: "Ambala Cantt - Civil Hospital", bus_no: "PB11DB6594", driver_name: "Narinder Singh", mobile: "97285-45364", start_time: "06:50", parking: "Vendor Bus" },
  { s_no: 4, route_no: "R-04", station: "Ambala City - Gurudwara Saheb Chowk", bus_no: "PB11DB6094", driver_name: "Sandep Kumar", mobile: "94160-96112", start_time: "07:00", parking: "Vendor Bus" },
  { s_no: 5, route_no: "R-05", station: "Ambala City - Omex", bus_no: "PB11DB2794", driver_name: "Mahesh Kumar", mobile: "99926-03517", start_time: "07:00", parking: "Vendor Bus" },
  { s_no: 6, route_no: "R-06", station: "Ambala City - Galaxy Mall", bus_no: "PB11DB5494", driver_name: "Surinder Singh", mobile: "94674-76407", start_time: "07:00", parking: "Vendor Bus" },
  { s_no: 7, route_no: "R-06 A", station: "Ambala City - Bus Stand", bus_no: "PB11DE6694", driver_name: "Kuldeep Singh", mobile: "98179-70068", start_time: "06:50", parking: "Vendor Bus" },
  { s_no: 8, route_no: "R-07", station: "Kalka - Pump", bus_no: "PB65AD1037", driver_name: "Jagroop Singh", mobile: "98555-47458", start_time: "07:15", parking: "Mandi Parking" },
  { s_no: 9, route_no: "R-07A", station: "Pinjore HMT Pump", bus_no: "PB65AN1171", driver_name: "Singara Singh", mobile: "62303-10721", start_time: "07:15", parking: "" },
  { s_no: 10, route_no: "R-08", station: "Pinjore - Bus Stand", bus_no: "PB65AD0455", driver_name: "Sanjay Kumar", mobile: "86994-24472", start_time: "07:10", parking: "" },
  { s_no: 11, route_no: "R-09", station: "Panchkula - Ramgarh", bus_no: "PB65AD1033", driver_name: "Gurdev Singh", mobile: "98729-64317", start_time: "07:30", parking: "Nada Sahib" },
  { s_no: 12, route_no: "R-10", station: "Panchkula - Sec 4/5 Lights", bus_no: "CH01TC-0994", driver_name: "Dharam Singh", mobile: "70090-88277", start_time: "07:40", parking: "Vendor Bus" },
  { s_no: 13, route_no: "R-11", station: "Ludhiana - Agar Nagar", bus_no: "PB65BF9094", driver_name: "Balwinder Singh", mobile: "94638-09442", start_time: "06:45", parking: "Vendor Bus" },
  { s_no: 14, route_no: "R-12", station: "Ludhiana - Jalandhar Bypass", bus_no: "PB65DB4294", driver_name: "Kulwant Singh", mobile: "98886-86675", start_time: "07:00", parking: "Vendor Bus" },
  { s_no: 15, route_no: "R-13", station: "Ludhiana - Preet Palace", bus_no: "PB65BE7794", driver_name: "Harwinder Singh", mobile: "88722-48187", start_time: "07:15", parking: "Vendor Bus" },
  { s_no: 16, route_no: "R-13 A", station: "Ludhiana - Bharat Nagar", bus_no: "PB65BF9194", driver_name: "Sanjeevan Kumar", mobile: "98882-53203", start_time: "07:05", parking: "" },
  { s_no: 17, route_no: "R-13 B", station: "Ludhiana - Jamalpur", bus_no: "PB65-BF-2094", driver_name: "Gabbar Singh", mobile: "98763-61625", start_time: "07:20", parking: "CU Parking" },
  { s_no: 18, route_no: "R-14", station: "Patiala - Thapar", bus_no: "PB11DE5288", driver_name: "Varinder Singh", mobile: "84278-33417", start_time: "07:00", parking: "Vendor Bus" },
  { s_no: 19, route_no: "R-15", station: "Patiala - Bhadaurgarh", bus_no: "PB11DE2294", driver_name: "Gurjinder Singh", mobile: "90566-21217", start_time: "07:00", parking: "Vendor Bus" },
  { s_no: 20, route_no: "R-16", station: "Patiala - Tej Pal Colony via Chunni", bus_no: "PB11DE2394", driver_name: "Manjeet Singh", mobile: "98785-08891", start_time: "07:15", parking: "Vendor Bus" },
  { s_no: 21, route_no: "R-16 A", station: "Sirhind", bus_no: "PB65RR9803", driver_name: "Manjeet Singh", mobile: "99151-66420", start_time: "07:55", parking: "Gurudwara" },
  { s_no: 22, route_no: "R-17", station: "Panchkula - Barrier", bus_no: "CH01TB-1494", driver_name: "Bablu Kumar", mobile: "98159-71806", start_time: "07:35", parking: "Vendor Bus" },
  { s_no: 23, route_no: "R-18", station: "Zirakpur - Dhakoli", bus_no: "PB65V7714", driver_name: "Daljit Singh", mobile: "94656-26857", start_time: "07:40", parking: "Bus Stand Zirakpur" },
  { s_no: 24, route_no: "R-19", station: "Zirakpur - VIP Road", bus_no: "PB65Z4393", driver_name: "Bhupinder Singh", mobile: "80548-15216", start_time: "07:50", parking: "Bus Stand Zirakpur" },
  { s_no: 25, route_no: "R-19A", station: "Chattbir Light to CU", bus_no: "PB65Z4388", driver_name: "Lakhvir Singh", mobile: "81467-37515", start_time: "08:00", parking: "Nabha Sahib" },
  { s_no: 26, route_no: "R-20", station: "Sec-21 / Tank Chowk", bus_no: "PB65V-5763", driver_name: "Harsimranjeet Singh", mobile: "98558-06190", start_time: "07:30", parking: "" },
  { s_no: 27, route_no: "R-21", station: "Lalru Mandi (1)", bus_no: "PB11DE2694", driver_name: "Sucha Singh", mobile: "75085-27944", start_time: "07:15", parking: "Vendor Bus" },
  { s_no: 28, route_no: "R-22", station: "Derabassi (2)", bus_no: "PB65Z4391", driver_name: "Harjinder Singh", mobile: "81950-04095", start_time: "07:40", parking: "" },
  { s_no: 29, route_no: "R-23", station: "Panchkula - Sec-20 Dispensary", bus_no: "CH01TB8499", driver_name: "Santosh Kumar", mobile: "93503-41613", start_time: "07:25", parking: "Vendor Bus" },
  { s_no: 30, route_no: "R-24", station: "Amloh - Sirhind", bus_no: "PB11DE2494", driver_name: "Shamsher Singh", mobile: "94780-19027", start_time: "07:25", parking: "Vendor Bus" },
  { s_no: 31, route_no: "R-25", station: "Khanna - Bus Stand", bus_no: "PB65-AD-1034", driver_name: "Tejinderpal Singh", mobile: "98761-62918", start_time: "07:25", parking: "Gurudwara Sahib" },
  { s_no: 32, route_no: "R-25 A", station: "Khanna - Gobindgarh", bus_no: "PB65-Z-4389", driver_name: "Daljeet Singh", mobile: "89681-61939", start_time: "07:45", parking: "" },
  { s_no: 33, route_no: "R-26", station: "Zirakpur - K-Area", bus_no: "PB65AD0457", driver_name: "Jaswinder Singh", mobile: "80547-47147", start_time: "07:40", parking: "Nabha Sahib" },
  { s_no: 34, route_no: "R-27", station: "Highland Park - ZKP PTL", bus_no: "PB65V7042", driver_name: "Jarnail Singh", mobile: "98151-43212", start_time: "07:50", parking: "Nabha Sahib" },
  { s_no: 35, route_no: "R-28", station: "Chandigarh - Mullanpur Khuda Ali Sher", bus_no: "PB65-AH-5765", driver_name: "Balwinder Singh", mobile: "95920-58739", start_time: "08:10", parking: "" },
  { s_no: 36, route_no: "R-29", station: "Chandigarh - Hallomajra", bus_no: "PB65-AN-2058", driver_name: "Gurdev Singh", mobile: "98157-58019", start_time: "07:50", parking: "Siswan Road village Block Majri Petrol pump" },
  { s_no: 37, route_no: "R-30", station: "Zirakpur - Bauli Sahib", bus_no: "PB65-R-9804", driver_name: "Sukhjinder Singh", mobile: "90564-63136", start_time: "07:50", parking: "" },
  { s_no: 38, route_no: "R-31", station: "Omaxe - New Chandigarh", bus_no: "PB65-V-8073", driver_name: "Surinder Singh", mobile: "62840-84889", start_time: "07:30", parking: "" },
  { s_no: 39, route_no: "R-32", station: "Baddi - Kurali", bus_no: "PB 11DH-5027", driver_name: "Mohan Lal", mobile: "97369-11701", start_time: "07:30", parking: "" },
  { s_no: 40, route_no: "R-33", station: "Chandigarh - Saketri", bus_no: "PB65AN2057", driver_name: "Sukhvir Singh", mobile: "94174-50360", start_time: "07:30", parking: "Kooni Sahib Gurudwara" },
  { s_no: 41, route_no: "R-34", station: "Chandigarh - Manimajra", bus_no: "PB65AN2055", driver_name: "Satvinder Singh", mobile: "88723-94243", start_time: "07:40", parking: "Parking of Buses" },
  { s_no: 42, route_no: "R-35", station: "Rajpura - Bus Stand", bus_no: "PB65AN1173", driver_name: "Charanjeet Singh", mobile: "99149-78147", start_time: "07:30", parking: "Sec 80 Parking" },
  { s_no: 43, route_no: "R-36", station: "Ropar - Morinda", bus_no: "PB65V7041", driver_name: "Kulwinder Singh", mobile: "78143-86193", start_time: "07:30", parking: "Sec 80 Parking" },
  { s_no: 44, route_no: "R-37", station: "Ropar - Bela Chowk", bus_no: "PB65R9801", driver_name: "Manpreet Singh", mobile: "9592510512", start_time: "08:00", parking: "Village Harpal Pur at driver's home" },
  { s_no: 45, route_no: "R-38", station: "Bela - Behrampur", bus_no: "PB65Z4390", driver_name: "Satnam Singh", mobile: "97814-85545", start_time: "07:35", parking: "New Bus Stand Ropar" },
  { s_no: 46, route_no: "R-39", station: "Machhiwara - Samrala", bus_no: "PB65R9805", driver_name: "Nazar Singh", mobile: "94175-70918", start_time: "07:40", parking: "New Bus Stand Ropar" },
  { s_no: 47, route_no: "R-40", station: "Bassi - Pathana", bus_no: "PB65AD-2056", driver_name: "Gurdarshan Singh", mobile: "98553-16962", start_time: "08:20", parking: "Village Kotla at student's home" },
  { s_no: 48, route_no: "R-41", station: "Mullanpur Garib Das", bus_no: "PB65AD-2059", driver_name: "Mukhtiar Singh", mobile: "84379-34347", start_time: "07:40", parking: "Dalla at driver's home" },
  { s_no: 49, route_no: "R-42", station: "Chandigarh Sec-23/24", bus_no: "PB65-AD-0454", driver_name: "Kuldeep Singh", mobile: "89681-08359", start_time: "08:00", parking: "Sec 80 Parking" },
  { s_no: 50, route_no: "R-43", station: "Chandigarh - Ramdarbar", bus_no: "PB65AN-1169", driver_name: "Navjot Singh", mobile: "62805-70007", start_time: "08:00", parking: "Sec 80 Parking" },
  { s_no: 51, route_no: "R-44", station: "Chandigarh - Sector-28", bus_no: "PB65-AD-0459", driver_name: "Rajinder Singh", mobile: "88375-49372", start_time: "08:00", parking: "Sec 80 Parking" },
  { s_no: 52, route_no: "R-44 A", station: "Chandigarh - 47 Market", bus_no: "PB65-Z-4967", driver_name: "Dalvir Singh", mobile: "89680-82984", start_time: "07:50", parking: "Sec 80 Parking" },
  { s_no: 53, route_no: "R-45", station: "Chandigarh Sec-32", bus_no: "PB65AD-1036", driver_name: "Gurpreet Singh", mobile: "97798-27906", start_time: "08:00", parking: "Sec 80 Parking" },
  { s_no: 54, route_no: "R-46", station: "Chandigarh Sec-48", bus_no: "PB65AH-7184", driver_name: "Balwinder Singh", mobile: "98889-96180", start_time: "07:50", parking: "Sec 80 Parking" },
  { s_no: 55, route_no: "R-47", station: "Chandigarh - Sec-47", bus_no: "PB65V-5764", driver_name: "Satnam Singh", mobile: "98724-78913", start_time: "08:00", parking: "Sec 80 Parking" },
  { s_no: 56, route_no: "R-48", station: "Mohali - Phase-10 Silvi Park", bus_no: "PB65R-9809", driver_name: "Swaran Singh", mobile: "94631-06898", start_time: "08:05", parking: "Sec 80 Parking" },
  { s_no: 57, route_no: "R-49", station: "Mohali Sec-68 Kumbra via Landran", bus_no: "PB65-V-4216", driver_name: "Satnam Singh", mobile: "82840-69349", start_time: "07:50", parking: "Sec 80 Parking" },
  { s_no: 58, route_no: "R-50", station: "Mohali Phase-7", bus_no: "PB65R9806", driver_name: "Tarsem Singh", mobile: "88721-26694", start_time: "08:15", parking: "Sec 80 Parking" },
  { s_no: 59, route_no: "R-51", station: "Mohali Sec-85 Wave Estate", bus_no: "PB65-AN-1174", driver_name: "Manider Singh", mobile: "84372-27952", start_time: "08:00", parking: "Sec 80 Parking" },
  { s_no: 60, route_no: "R-52", station: "Mohali - Chawla Chowk", bus_no: "PB65-R-9812", driver_name: "Dilbag Singh (Dhangrali)", mobile: "90415-27489", start_time: "08:15", parking: "Sec 80 Parking" },
  { s_no: 61, route_no: "R-53", station: "Balongi - Kharar", bus_no: "PB65-AD-1035", driver_name: "Balwinder Mann", mobile: "84379-57100", start_time: "08:25", parking: "CU Parking" },
  { s_no: 62, route_no: "R-54", station: "New Sunny - KFC 1", bus_no: "PB65-R-9810", driver_name: "Satwant Singh", mobile: "95015-20093", start_time: "08:20", parking: "" },
  { s_no: 63, route_no: "R-55", station: "New Sunny - Jalvayu", bus_no: "PB65-R-9807", driver_name: "Gurpreet Singh", mobile: "86996-20786", start_time: "08:15", parking: "City Hostel" },
  { s_no: 64, route_no: "R-56", station: "Kurali - Kharar - CU", bus_no: "PB65-Z-4968", driver_name: "Karamjeet Singh", mobile: "98785-14286", start_time: "08:25", parking: "" },
  { s_no: 65, route_no: "R-57", station: "Gurudwara - Santema jra", bus_no: "PB65-R-9808", driver_name: "Gurdeep Singh", mobile: "91588-34525", start_time: "08:20", parking: "Landran College" },
  { s_no: 66, route_no: "R-58", station: "Ropar - Nuhon Colony (Ali Pur)", bus_no: "PB65V8072", driver_name: "Gurmail Singh", mobile: "99145-97450", start_time: "07:35", parking: "" }
];

async function seedDrivers() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not found in environment. Please check your .env file.");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB successfully.");

    let inserted = 0;
    let updated = 0;

    for (const d of DRIVERS_DATA) {
      const cleanPhone = d.mobile.replace(/\D/g, "");
      const normalizedPhone = "+91" + (cleanPhone.length === 10 ? cleanPhone : cleanPhone.slice(-10));
      const routeSlug = d.route_no.toLowerCase().replace(/[^a-z0-9]/g, "");
      const email = `driver.${routeSlug}@cu.ac.in`;

      const driverDoc = {
        name: d.driver_name.trim(),
        phone: normalizedPhone,
        email: email,
        password: "Pass@123", // Default password for instant login
        routeNo: d.route_no.trim().toUpperCase(),
        vehicleNo: d.bus_no.trim().toUpperCase(),
        station: d.station.trim(),
        startTime: d.start_time.trim(),
        parking: d.parking ? d.parking.trim() : "",
        isActive: true,
        status: "approved"
      };

      // Check if driver already exists by phone or routeNo
      const existing = await Driver.findOne({
        $or: [
          { phone: normalizedPhone },
          { phone: cleanPhone },
          { routeNo: driverDoc.routeNo }
        ]
      });

      if (existing) {
        existing.name = driverDoc.name;
        existing.phone = driverDoc.phone;
        existing.email = driverDoc.email;
        existing.routeNo = driverDoc.routeNo;
        existing.vehicleNo = driverDoc.vehicleNo;
        existing.station = driverDoc.station;
        existing.startTime = driverDoc.startTime;
        existing.parking = driverDoc.parking;
        existing.isActive = true;
        existing.status = "approved";
        existing.password = "Pass@123";
        await existing.save();
        updated++;
      } else {
        await Driver.create(driverDoc);
        inserted++;
      }
    }

    console.log(`Seeding complete: ${inserted} drivers created, ${updated} drivers updated.`);
    console.log(`All 66 drivers now active with password "Pass@123" and emails like "driver.r01@cu.ac.in".`);
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDrivers();
}

module.exports = { DRIVERS_DATA, seedDrivers };
