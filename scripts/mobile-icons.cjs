const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'assets/app-icon.svg'));
(async()=>{
 await sharp(source).png().toFile(path.join(root,'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'));
 for(const [density,size,foreground] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]){
  const dir=path.join(root,'android/app/src/main/res/mipmap-'+density);
  for(const name of ['ic_launcher.png','ic_launcher_round.png'])await sharp(source).resize(size,size).png().toFile(path.join(dir,name));
  await sharp(source).resize(foreground,foreground).png().toFile(path.join(dir,'ic_launcher_foreground.png'));
 }
 const androidRes=path.join(root,'android/app/src/main/res');
 const splashFiles=fs.readdirSync(androidRes).filter(dir=>dir.startsWith('drawable')).map(dir=>path.join(androidRes,dir,'splash.png')).filter(file=>fs.existsSync(file));
 const iosSplash=path.join(root,'ios/App/App/Assets.xcassets/Splash.imageset');
 splashFiles.push(...fs.readdirSync(iosSplash).filter(file=>file.endsWith('.png')).map(file=>path.join(iosSplash,file)));
 for(const file of splashFiles){
  const {width,height}=await sharp(file).metadata();
  const size=Math.round(Math.min(width,height)/3);
  const mark=await sharp(source).resize(size,size).png().toBuffer();
  await sharp({create:{width,height,channels:3,background:'#191713'}}).composite([{input:mark,gravity:'centre'}]).png().toFile(file+'.new.png');
  fs.renameSync(file+'.new.png',file);
 }
 console.log('Generated native icons from the checked-in vector mark.');
})().catch(error=>{console.error(error);process.exitCode=1;});
