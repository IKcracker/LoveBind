// One-time importer for the GeoNames cities1000 TSV. Never runs during server startup.
// Usage: node scripts/import-geonames.cjs path/to/cities1000.txt
require('dotenv').config({path:require('path').resolve(__dirname,'../.env.local')});
require('dotenv').config({path:require('path').resolve(__dirname,'../.env')});
const fs=require('node:fs'),readline=require('node:readline');
const {PrismaClient}=require('@prisma/client');
const prisma=new PrismaClient();
const file=process.argv[2];
if(!file||!fs.existsSync(file)){console.error('Pass the extracted cities1000.txt path');process.exit(1)}
(async()=>{
 let batch=[],count=0;
 async function flush(){
  if(!batch.length)return;
  await prisma.geoCity.createMany({data:batch,skipDuplicates:true});
  count+=batch.length;batch=[];
 }
 for await(const line of readline.createInterface({input:fs.createReadStream(file),crlfDelay:Infinity})){
  const f=line.split('\t');if(f.length<15)continue;
  const id=Number(f[0]),population=Number(f[14]),latitude=Number(f[4]),longitude=Number(f[5]);
  if(!Number.isSafeInteger(id)||!Number.isSafeInteger(population)||!Number.isFinite(latitude)||!Number.isFinite(longitude)||!f[8])continue;
  batch.push({id,name:f[1].slice(0,120),asciiName:f[2].slice(0,120),countryCode:f[8].slice(0,2),admin1Code:f[10]?.slice(0,40)||null,population,latitude,longitude});
  if(batch.length===300)await flush();
 }
 await flush();console.log('Imported '+count+' city rows (existing IDs skipped)');
})().catch(e=>{console.error('Import failed:',e.message);process.exitCode=1}).finally(()=>prisma.$disconnect());
