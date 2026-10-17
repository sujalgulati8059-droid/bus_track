require("dotenv").config();
const mongoose=require("mongoose"),Route=require("../models/Route"),ParkingSlot=require("../models/ParkingSlot");
const COLORS=["#f97316","#3b82f6","#10b981","#8b5cf6","#ef4444","#f59e0b","#06b6d4","#ec4899","#84cc16","#6366f1"];
const REGIONS={"R-01":"AMBALA","R-02":"AMBALA","R-03":"AMBALA","R-04":"AMBALA","R-05":"AMBALA","R-06":"AMBALA","R-06 A":"AMBALA","R-07":"PINJORE","R-07A":"PINJORE","R-08":"PINJORE","R-09":"PANCHKULA","R-10":"PANCHKULA","R-17":"PANCHKULA","R-23":"PANCHKULA","R-11":"LUDHIANA","R-12":"LUDHIANA","R-13":"LUDHIANA","R-13 A":"LUDHIANA","R-13 B":"LUDHIANA","R-14":"PATIALA","R-15":"PATIALA","R-16":"PATIALA","R-16 A":"PATIALA","R-24":"PATIALA","R-18":"ZIRAKPUR","R-19":"ZIRAKPUR","R-19 A":"ZIRAKPUR","R-26":"ZIRAKPUR","R-30":"ZIRAKPUR","R-28":"CHANDIGARH","R-29":"CHANDIGARH","R-33":"CHANDIGARH","R-34":"CHANDIGARH","R-41":"CHANDIGARH","R-42":"CHANDIGARH","R-43":"CHANDIGARH","R-44":"CHANDIGARH","R-44 A":"CHANDIGARH","R-45":"CHANDIGARH","R-46":"CHANDIGARH","R-47":"CHANDIGARH","R-48":"MOHALI","R-49":"MOHALI","R-50":"MOHALI","R-51":"MOHALI","R-52":"MOHALI","R-27":"MOHALI"};
const fwd=[
{routeNo:"R-01",routeName:"AMBALA CANTT-DEFENCE COLONY",stops:["KHARGA CANTEEN","GOC BANGLA","SEC D","GURUDWARA SAHIB","DHARMPAL TEA STALL","MILITARY HOSPITAL","CU"]},
{routeNo:"R-02",routeName:"AMBALA CANTT-DAV SCHOOL",stops:["DAV SCHOOL","RIVER SIDE","RAMA FILLING STATION","JANTA SWEET","CU"]},
{routeNo:"R-03",routeName:"AMBALA CANTT-CIVIL HOSPITAL",stops:["MAHESH NAGAR","CIVIL HOSPITAL","CU"]},
{routeNo:"R-04",routeName:"AMBALA CITY-GURUDWARA SAHEB CHOWK",stops:["GURUDWARA SAHIB CHOWK","SEC 10","JALBEHRA ROAD","MANAV CHOWK","CU"]},
{routeNo:"R-05",routeName:"AMBALA CITY-OMEX",stops:["AGARSEN CHOWK","KALKA CHOWK","MANJI SAHIB","OMEX","CU"]},
{routeNo:"R-06",routeName:"AMBALA CITY-GALAXY MALL",stops:["POLYTECHNIC CHOWK","GALAXY MALL","PETROL PUMP","OLD SESSION COURT","SEC 1","INCO CHOWK","PREM NAGAR","JANDLI","JAGGI CITY","CENTER","FLYOVER","CU"]},
{routeNo:"R-06 A",routeName:"AMBALA CITY-BUS STAND",stops:["MERCURY SCHOOL","CHIRIYA LINE","BUS STAND","BALDEV NAGAR BUS STAND","BALDEV NAGAR NARAYANGARH CHOWK","CU"]},
{routeNo:"R-07",routeName:"KALKA-PUMP",stops:["KALKA PUMP","SOFIA SCHOOL","HOUSING BOARD","BASANT BIHAR","KK FARM","DHARAMPURA VILLAGE","CU"]},
{routeNo:"R-07A",routeName:"PINJORE HMT PUMP",stops:["PINJORE HMT PUMP","SURAJPUR","AMARAVATI ENCL","CHANDI FATAK","CHANDI MANDIR LIGHTS","SEKHON PALACE","LOHGARH LIGHTS","LOHGARH GURUDWARA SAHIB","AERO CITY LIGHTS","BAKARPUR","CU"]},
{routeNo:"R-08",routeName:"PINJORE-BUS STAND",stops:["RONAK HOTEL","PINJORE BUS STAND","YADWINDERA GARDEN","MALLHA CHOWK","CU"]},
{routeNo:"R-09",routeName:"PANCHKULA-RAMGARH",stops:["NADHA SAHIB ROAD","SEC 23","MADANPUR VILL","RAMGARH","SEC 28 DIVIDING","SEC 26/27 CHOWK","SEC 25 MARKET","SEC 24/25 CHOWK","TAU DEVI LAL STADIUM","CU"]},
{routeNo:"R-10",routeName:"PANCHKULA-SEC 4/5 LIGHTS",stops:["SEC 4/5 LIGHTS","SEC 4 MARKET","SATLUJ SCHOOL","SEC 4/12 T POINT","RALLY CHOWK","SEC 12 BUS STAND","HR BARRIER","SUNDAR NAGAR","CU"]},
{routeNo:"R-11",routeName:"LUDHIANA-AGAR NAGAR",stops:["BADDOWAL RELIANCE PUMP","HAVELI DHABA","GOHAR PUMP","AYALI CHOWK","RAJ GURU NAGAR","AGAR NAGAR","GRAND WALK","PAU GATE NO-1","DHOLEWALA CHOWK","SHERPUR CHOWK","SAMRALA BYPASS","CU"]},
{routeNo:"R-12",routeName:"LUDHIANA-JALANDAR BYPASS",stops:["JAGRAON FLYOVER","SALEM TAPRI","LOHA PULL","JALANDAR BYPASS","SHIVPURI CHOWK","BASTI CHOWK","CU"]},
{routeNo:"R-13",routeName:"LUDHIANA-PREET PALACE",stops:["PREET PALACE","DUGRI LIGHTS","GILL CHOWK","PRATAP CHOWK","KATANI KALAN","NEELON KALAN","CHEHLAN BUS STAND","CU"]},
{routeNo:"R-13 A",routeName:"LUDHIANA-BHARAT NAGAR",stops:["BHARAT NAGAR CHOWK","BUS STAND","SAMRALA CHOWK","SEC 32","PALM CITY","CU"]},
{routeNo:"R-13 B",routeName:"LUDHIANA-JAMALPUR",stops:["JAMALPUR LIGHT","VEER PALACE","MUKESH SWEETS","VARDMAAN PARK","KOHARA","CU"]},
{routeNo:"R-14",routeName:"PATIALA-THAPAR",stops:["SAI MARKET","RAJINDERA COLLEGE","GURU NANAK SCHOOL","NIC CHOWK","MOTI MEHAL","THAPAR COLLEGE","CU"]},
{routeNo:"R-15",routeName:"PATIALA-BHADARGARH",stops:["BHADURGARH","COMMANDO FORT","PUNJAB UNIVERSITY","RAJPURA BYPASS","DCW FLYOVER","HARDASPUR","CU"]},
{routeNo:"R-16",routeName:"PATIALA-TEJBAGH COLONY",stops:["TEJBAGH COLONY","DEVIGARH T POINT","OLD BUS STAND","SIRHIND BYPASS","RURKI","CU"]},
{routeNo:"R-16 A",routeName:"SIRHIND",stops:["SIRHIND GT ROAD","NEW BUS STAND","ROPAR ADDA","HP PUMP","HDFC BANK","GURUDWARA FATEHGARH SAHIB","CU"]},
{routeNo:"R-17",routeName:"PANCHKULA-BARRIER",stops:["TAX BARRIER","SEC 5 BUS STAND","SEC 11 MARKET","SEC 11/15 CHOWK","SEC 16 PETROL PUMP","CU"]},
{routeNo:"R-18",routeName:"ZIRAKPUR-DHAKOLI",stops:["MS ENCLAVE","DHAKOLI PHATAK","SHELLEY MARKET","CU"]},
{routeNo:"R-19",routeName:"ZIRAKPUR-VIP ROAD",stops:["METRO MALL","DOMINOS","VIP ROAD","MAYA GARDEN","JAIPURIA TOWER","CU"]},
{routeNo:"R-19 A",routeName:"CHATTBIR TO CU",stops:["HIGHLAND PARK","SABJI MANDI","AIRFORCE STATION","IISER","SOHANA BUS STAND","CU"]},
{routeNo:"R-20",routeName:"SEC-21 TANK CHOWK",stops:["SEC 21 MARKET","TANK CHOWK","BELLA VISTA","SEC 2 PUMP","SEC 10/11 CHOWK","CU"]},
{routeNo:"R-21",routeName:"LALRU MANDI",stops:["BHARAT GAS","LALRU BUS STAND","ITI CHOWK","DAPPAR TOLL PLAZA","DERABASSI BUS STAND","CU"]},
{routeNo:"R-22",routeName:"DERABASSI",stops:["DERABASSI BUS STAND","AXIS BANK","DAV SCHOOL","D MART","CU"]},
{routeNo:"R-23",routeName:"PANCHKULA SEC-20",stops:["SEC 20 DISPENSARY","SABJI MANDI","CU"]},
{routeNo:"R-24",routeName:"AMLOH-SIRHIND",stops:["AMLOH BUS STAND","GOBINDGARH LIGHTS","RELIANCE PUMP","CHUNNI BYPASS","CU"]},
{routeNo:"R-25",routeName:"KHANNA BUS STAND",stops:["MODEL TOWN","JARG CHOWK","NAMDEV MANDIR","UCHA PIND","CU"]},
{routeNo:"R-25 A",routeName:"KHANNA-GOBINDGARH",stops:["KHANNA BUS STAND","GOBINDGARH BUS STAND","RAIPUR","CU"]},
{routeNo:"R-26",routeName:"ZIRAKPUR-K AREA",stops:["K AREA LIGHTS","PARAS DOWNTOWN","GURUDWARA","CU"]},
{routeNo:"R-27",routeName:"HIGHLAND PARK",stops:["ROYAL CITY","SILVER CITY","MOTIYA CITY","CU"]},
{routeNo:"R-28",routeName:"CHANDIGARH-MULLANPUR",stops:["PGI CHOWK","SEC 24/25 LIGHT","CU"]},
{routeNo:"R-29",routeName:"CHANDIGARH-HALLOMAJRA",stops:["AIRPORT LIGHTS","HALLOMAJRA CHOWK","RAM DARBAR","CU"]},
{routeNo:"R-30",routeName:"ZIRAKPUR-BAULI SAHIB",stops:["DHAKOLI","BAULI SAHIB","LUCKY DHABA","CU"]},
{routeNo:"R-31",routeName:"OMAXE-NEW CHANDIGARH",stops:["OMAXE GATE","KURALI LIGHTS","VERKA CHOWK","CU"]},
{routeNo:"R-32",routeName:"BADDI-KURALI",stops:["BADDI BUS STAND","NAWA NAGAR","SISWAN","CU"]},
{routeNo:"R-33",routeName:"CHANDIGARH-SAKETRI",stops:["MANSA DEVI","IT PARK","SEC 26","SEC 41 MARKET","CU"]},
{routeNo:"R-34",routeName:"CHANDIGARH-MANIMAJRA",stops:["MANIMAJRA","RAILWAY STATION","SEC 26/7 CHOWK","CU"]},
{routeNo:"R-35",routeName:"RAJPURA BUS STAND",stops:["DURGA MANDIR","NILPUR GURUDWARA","BANUR CHOWK","CU"]},
{routeNo:"R-36",routeName:"ROPAR-MORINDA",stops:["GOVT COLLEGE","RAILON LIGHTS","SALAPUR","CU"]},
{routeNo:"R-37",routeName:"ROPAR-BELA CHOWK",stops:["WATER LILY","BELA CHOWK","SURJIT HOSPITAL","CU"]},
{routeNo:"R-38",routeName:"BELA-BEHRAMPUR",stops:["SHERPUR BET","CHAMKAUR SAHIB","MORINDA BYPASS","CU"]},
{routeNo:"R-39",routeName:"MACHHIWARA-SAMRALA",stops:["MACHHIWARA","SAMRALA BUS STAND","KHAMANO","CU"]},
{routeNo:"R-40",routeName:"BASSI PATHANA",stops:["ITI CHOWK","BASSI BUS STAND","MORINDA LIGHTS","CU"]},
{routeNo:"R-41",routeName:"MULLANPUR",stops:["ECO CITY","PGI BUS STAND","SEC 14/15","CU"]},
{routeNo:"R-42",routeName:"CHANDIGARH SEC-23/24",stops:["SEC 23/24 LIGHTS","FIRE BRIGADE CHOWK","SEC 40","CU"]},
{routeNo:"R-43",routeName:"CHANDIGARH RAMDARBAR",stops:["SEC 20/21 LIGHTS","SEC 22 MARKET","SEC 35","CU"]},
{routeNo:"R-44",routeName:"CHANDIGARH SEC-28",stops:["SEC 29 MARKET","SEC 17 BUS STAND","SEC 36/37","CU"]},
{routeNo:"R-44 A",routeName:"CHD-47 MARKET",stops:["SEC 47 MARKET","PHASE 11 BSNL","CU"]},
{routeNo:"R-45",routeName:"CHANDIGARH SEC-32",stops:["SEC 32 MARKET","SEC 34/45","BSNL EXCHANGE","CU"]},
{routeNo:"R-46",routeName:"CHANDIGARH SEC-48",stops:["SEC 48 MARKET","SEC 50 LIGHTS","BURAIL JAIL","CU"]},
{routeNo:"R-47",routeName:"CHANDIGARH SEC-47",stops:["CTU BUS STAND","SEC 46/47 CHOWK","SEC 42 CTU STOP","CU"]},
{routeNo:"R-48",routeName:"MOHALI PHASE-10",stops:["PHASE 10 PARK","KUMBRA CHOWK","PCL CHOWK","CU"]},
{routeNo:"R-49",routeName:"MOHALI SEC-68",stops:["SEC 68 LAW COLLEGE","NIPER","SOHANA","CU"]},
{routeNo:"R-50",routeName:"MOHALI PHASE-7",stops:["PHASE 7 MARKET","PHASE 5 GURUDWARA","CITY HEART","CU"]},
{routeNo:"R-51",routeName:"MOHALI SEC-85",stops:["WAVE ESTATE","SEC 85 CROSSING","LANDRAN","CU"]},
{routeNo:"R-52",routeName:"MOHALI CHAWLA CHOWK",stops:["PHASE 3/7 LIGHTS","MADANPUR","VERKA CHOWK","CU"]},
{routeNo:"R-53",routeName:"BALONGI-KHARAR",stops:["VR MALL","KHARAR BUS STAND","CIVIL HOSPITAL","CU"]},
{routeNo:"R-54",routeName:"NEW SUNNY-KFC",stops:["NAV CITY","SUNNY ENCLAVE","KFC","CU"]},
{routeNo:"R-55",routeName:"NEW SUNNY-JALVAYU",stops:["CITY HOSTEL","JALVAYU TOWER","KFC","CU"]},
{routeNo:"R-56",routeName:"KURALI-KHARAR",stops:["KURALI BUS STAND","KHARAR","OMEGA CITY","CU"]},
{routeNo:"R-57",routeName:"GURUDWARA-SANTEMAJRA",stops:["SANTEMAJRA","GLOBAL ENCLAVE","KHARAR BUS STAND","CU"]},
{routeNo:"R-58",routeName:"ROPAR-NUHON COLONY",stops:["AMBUJA FACTORY","GHANAULI","POWER COLONY","CU"]},
];
const ret=fwd.map(r=>({routeNo:r.routeNo+"-R",routeName:"CU to "+r.routeName,stops:[...r.stops].reverse(),departureTime:"16:45"}));
const all=[...fwd.map((r,i)=>({...r,departureTime:"08:00",region:REGIONS[r.routeNo]||"OTHER",color:COLORS[i%COLORS.length]})),...ret.map((r,i)=>({...r,region:REGIONS[r.routeNo.replace("-R","")]||"OTHER",color:COLORS[i%COLORS.length]}))];
async function seed(){
  try{
    await mongoose.connect(process.env.MONGO_URI);console.log("Connected");
    await Route.deleteMany({});const inserted=await Route.insertMany(all);
    console.log(inserted.length+" routes inserted");
    const ROWS=["A","B","C","D","E"],COLS=12,slots=[];
    ROWS.forEach(row=>{for(let p=1;p<=COLS;p++)slots.push({slotId:`${row}-${String(p).padStart(2,"0")}`,row,position:p,status:"empty"});});
    await ParkingSlot.deleteMany({});await ParkingSlot.insertMany(slots);
    const rets=inserted.filter(r=>r.routeNo.includes("-R")).slice(0,60);
    for(let i=0;i<rets.length;i++){const row=ROWS[Math.floor(i/COLS)],col=i%COLS+1;await ParkingSlot.updateOne({slotId:`${row}-${String(col).padStart(2,"0")}`},{$set:{routeNo:rets[i].routeNo,status:"parked",departureTime:"16:45",assignedAt:new Date()}});}
    console.log("Parking done: "+slots.length+" slots, "+rets.length+" assigned");
    process.exit(0);
  }catch(e){console.error(e.message);process.exit(1);}
}
seed();
