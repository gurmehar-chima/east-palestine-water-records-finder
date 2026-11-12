// Simulated responses for Open-Meteo, USGS and Ollama so tests run offline.
// These values are invented for testing only.
function hourly(n, f){ const now=new Date(); now.setUTCMinutes(0,0,0); const t=[],v=[]; for(let i=n-1;i>=-24;i--){ const d=new Date(+now-i*3600e3); t.push(d.toISOString().slice(0,16)); v.push(+f(i).toFixed(1)); } return {t,v,cur:now.toISOString().slice(0,16)}; }
function air(){ const k=["us_aqi","pm2_5","pm10","ozone","nitrogen_dioxide","carbon_monoxide","sulphur_dioxide"]; const base={us_aqi:38,pm2_5:7,pm10:12,ozone:55,nitrogen_dioxide:9,carbon_monoxide:180,sulphur_dioxide:2};
  const h={time:null}, cur={}; k.forEach(x=>{ const s=hourly(49,i=>base[x]*(1+0.35*Math.sin(i/4))); h.time=s.t; h[x]=s.v; cur[x]=s.v[48]; cur.time=s.cur; });
  return {hourly:h, current:cur, hourly_units:{}}; }
function wx(){ const h={}, cur={time:null}; const s1=hourly(49,i=>48+9*Math.sin(i/3.8)); const s2=hourly(49,i=>7+4*Math.cos(i/5)); const s3=hourly(49,i=>70+10*Math.sin(i/6)); const s4=hourly(49,()=>0);
  Object.assign(h,{time:s1.t,temperature_2m:s1.v,wind_speed_10m:s2.v,relative_humidity_2m:s3.v,precipitation:s4.v});
  Object.assign(cur,{time:s1.cur,temperature_2m:s1.v[48],relative_humidity_2m:s3.v[48],precipitation:0,wind_speed_10m:s2.v[48],wind_direction_10m:290,wind_gusts_10m:15}); return {hourly:h,current:cur}; }
function usgs(){ const now=Date.now(); const mk=(code,unit,f)=>({variable:{variableCode:[{value:code}],unit:{unitCode:unit},noDataValue:-999999,variableName:code},sourceInfo:{siteName:"LITTLE BEAVER CREEK NEAR EAST LIVERPOOL OH"},values:[{value:Array.from({length:192},(_,i)=>({value:String(f(i).toFixed(2)),dateTime:new Date(now-(191-i)*900e3).toISOString()}))}]});
  return {value:{timeSeries:[mk("00060","ft3/s",i=>310+40*Math.sin(i/30)),mk("00065","ft",i=>2.4+0.15*Math.sin(i/30))]}}; }
// Simulated WebGPU + WebLLM (in-browser AI) for browsers without Ollama.
const WEBGPU_MOCK = `
  Object.defineProperty(navigator, "gpu", {value:{requestAdapter: async()=>({features:new Set(["shader-f16"])})}, configurable:true});
  window.__webllmMock = {
    prebuiltAppConfig:{model_list:[{model_id:"Llama-3.2-3B-Instruct-q4f16_1-MLC"},{model_id:"Llama-3.2-1B-Instruct-q4f16_1-MLC"}]},
    CreateMLCEngine: async (id, cfg)=>{ for(const p of [0.25,0.6,1]){ await new Promise(r=>setTimeout(r,60)); cfg.initProgressCallback({progress:p, text:"Loading model"}); }
      return { interruptGenerate(){}, chat:{completions:{create: async()=> (async function*(){
        for(const w of "An MCL is the highest amount of a chemical EPA allows in public drinking water. See National Primary Drinking Water Regulations (https://www.epa.gov/ground-water-and-drinking-water/national-primary-drinking-water-regulations).".split(/(?<= )/)) yield {choices:[{delta:{content:w}}]};
      })()}}}; }
  };`;
async function install(page, {ollama=true, webgpu=false, aiText="Vinyl chloride is a gas used to make PVC plastic. See ToxFAQs: Vinyl Chloride (https://wwwn.cdc.gov/TSP/ToxFAQs/ToxFAQsDetails.aspx?faqid=281&toxid=51). A made-up link: https://example.com/fake. Print this page and talk to a librarian for more help."}={}){
  if(webgpu) await page.addInitScript(WEBGPU_MOCK);
  await page.route(/air-quality-api\.open-meteo\.com/, r=>r.fulfill({json:air(), headers:{"access-control-allow-origin":"*"}}));
  await page.route(/\/\/api\.open-meteo\.com/, r=>r.fulfill({json:wx(), headers:{"access-control-allow-origin":"*"}}));
  await page.route(/waterservices\.usgs\.gov/, r=>r.fulfill({json:usgs(), headers:{"access-control-allow-origin":"*"}}));
  await page.route(/127\.0\.0\.1:11434\/api\/tags/, r=> ollama ? r.fulfill({json:{models:[{name:"llama3.1:8b"}]}, headers:{"access-control-allow-origin":"*"}}) : r.abort());
  await page.route(/127\.0\.0\.1:11434\/api\/chat/, r=>{
    const words = (page.__aiText||aiText).split(/(?<= )/);
    const body = words.map(w=>JSON.stringify({message:{role:"assistant",content:w},done:false})).join("\n")+"\n"+JSON.stringify({done:true})+"\n";
    r.fulfill({status:200, body, headers:{"content-type":"application/x-ndjson","access-control-allow-origin":"*"}});
  });
}
module.exports = {install};
