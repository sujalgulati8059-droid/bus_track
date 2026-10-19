// Same stop-coordinate table the web map and the server's tracking simulation use.
// Stops not listed here get a stable pseudo-position around campus (same fallback
// as the web) - replace with real lat/lng stored on the Route model when you have it.
const CU = [30.7735, 76.5763];
export const GPS = {"CU":[30.7735,76.5763],"KHARAR BUS STAND":[30.7462,76.6450],"SUNNY ENCLAVE":[30.7310,76.6220],"NAV CITY":[30.7280,76.6180],"KFC":[30.7350,76.6280],"DERABASSI BUS STAND":[30.6020,76.8030],"PHASE 7 MARKET":[30.7050,76.7140],"PHASE 5 GURUDWARA":[30.7100,76.7100],"CITY HEART":[30.7060,76.7160],"SEC 17 BUS STAND":[30.7404,76.7878],"SOHANA":[30.7160,76.6890],"SOHANA BUS STAND":[30.7160,76.6890],"LANDRAN":[30.8001,76.5901],"KURALI BUS STAND":[30.8180,76.5720],"MANSA DEVI":[30.7560,76.8100],"IT PARK":[30.7300,76.8050],"MANIMAJRA":[30.7260,76.8420],"AIRPORT LIGHTS":[30.6730,76.7880],"DHAKOLI":[30.7010,76.7900],"VR MALL":[30.7480,76.6420],"KALKA PUMP":[30.8400,76.9550],"PINJORE BUS STAND":[30.7980,76.9200],"PGI CHOWK":[30.7650,76.7760],"OMAXE GATE":[30.8400,76.5500],"WAVE ESTATE":[30.7500,76.6200],"CTU BUS STAND":[30.7410,76.7840],"RAM DARBAR":[30.7380,76.7560],"ECO CITY":[30.8100,76.7600],"GLOBAL ENCLAVE":[30.7510,76.6360],"SANTEMAJRA":[30.7550,76.6300],"BADDI BUS STAND":[30.9600,76.7900],"MACHHIWARA":[30.9180,76.9570]};

export const stopCoords = (name) => {
  const k = String(name).toUpperCase();
  if (GPS[k]) return GPS[k];
  const s = String(name).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const ang = ((s % 360) * Math.PI) / 180;
  const d = 0.04 + (s % 100) * 0.003;
  return [CU[0] + Math.cos(ang) * d, CU[1] + Math.sin(ang) * d];
};

export const CU_CENTER = CU;
