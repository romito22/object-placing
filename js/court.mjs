export function dimensions(length = 18, netHeight = 2.43) {
  if (!Number.isFinite(length) || length < 6 || length > 18) throw new RangeError('El largo debe estar entre 6 y 18 m.');
  if (![2.43, 2.24].includes(netHeight)) throw new RangeError('Altura de red inválida.');
  return { length, width: length / 2, attack: length / 6, netHeight, diagonal: Math.hypot(length, length / 2), scale: length / 18 };
}

export function geometry(d, showNet = true) {
  const boxes = [];
  const box = (name, x, y, z, sx, sy, sz, material = 'White') => boxes.push({ name, center: [x,y,z], size: [sx,sy,sz], material });
  const l = d.length, w = d.width, t = .05;
  // Boundary lines belong inside the measured 18 × 9 m rectangle.
  for (const side of [-1,1]) {
    box(`End${side < 0 ? 'A' : 'B'}`, side*(l/2-t/2), .008, 0, t, .016, w);
    box(`Side${side < 0 ? 'A' : 'B'}`, 0, .008, side*(w/2-t/2), l, .016, t);
    // FIVB measures the rear edge of the attack line from the center-line axis.
    box(`Attack${side < 0 ? 'A' : 'B'}`, side*(d.attack-t/2), .008, 0, t, .016, w);
    const z = side*(w/2+1);
    box(`PostMark${side < 0 ? 'A' : 'B'}X`, 0,.012,z,.4,.024,.035,'Gold');
    box(`PostMark${side < 0 ? 'A' : 'B'}Z`, 0,.012,z,.035,.024,.4,'Gold');
    if (showNet) box(`Post${side < 0 ? 'A' : 'B'}`,0,1.275,z,.07,2.55,.07,'Gold');
  }
  box('Center',0,.009,0,t,.018,w);
  let n = 0;
  for (const x of [-l/2,l/2]) for (const z of [-w/2,w/2]) {
    // The intersection of each cross is the exact outside corner.
    box(`Corner${++n}X`,x,.019,z,.4,.012,.025,'Gold');
    box(`Corner${n}Z`,x,.019,z,.025,.012,.4,'Gold');
  }
  if (showNet) {
    const nw = w+1, h = d.netHeight;
    box('NetTop',0,h-.035,0,.025,.07,nw);
    box('NetBottom',0,h-1+.025,0,.02,.05,nw);
    for (let i=1;i<10;i++) box(`NetRow${i}`,0,h-1+i/10,0,.008,.008,nw,'Net');
    const count = Math.ceil(nw/.1);
    for(let i=0;i<=count;i++) box(`NetColumn${i}`,0,h-.5,-nw/2+i*nw/count,.008,1,.008,'Net');
  }
  return boxes;
}

const tuple = a => `(${a.map(v => Number(v.toFixed(6))).join(', ')})`;
export function makeUSDA(d, showNet = true) {
  let usd = `#usda 1.0\n(\n defaultPrim = "Court"\n metersPerUnit = 1\n upAxis = "Y"\n)\ndef Xform "Court" (kind = "component") {\n`;
  for(const [name,color] of Object.entries({White:[.95,.95,.88],Gold:[1,.72,.035],Net:[.12,.18,.14]})) {
    usd += `def Material "${name}" {\n token outputs:surface.connect = </Court/${name}/Surface.outputs:surface>\n def Shader "Surface" {\n uniform token info:id = "UsdPreviewSurface"\n color3f inputs:diffuseColor = ${tuple(color)}\n float inputs:roughness = 1\n token outputs:surface\n }\n}\n`;
  }
  for (const b of geometry(d,showNet)) {
    const lo = b.center.map((v,i)=>v-b.size[i]/2), hi=b.center.map((v,i)=>v+b.size[i]/2);
    const points = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]].map(p=>tuple(p.map((v,i)=>v?hi[i]:lo[i])));
    usd += `def Mesh "${b.name}" (prepend apiSchemas = ["MaterialBindingAPI"]) {\n point3f[] points = [${points.join(',')}]\n float3[] extent = [${tuple(lo)},${tuple(hi)}]\n int[] faceVertexCounts = [4,4,4,4,4,4]\n int[] faceVertexIndices = [0,3,2,1,4,5,6,7,0,1,5,4,3,7,6,2,0,4,7,3,1,2,6,5]\n uniform token subdivisionScheme = "none"\n rel material:binding = </Court/${b.material}>\n}\n`;
  }
  return usd+'}\n';
}

// USDZ is an uncompressed ZIP; every file payload must start on a 64-byte boundary.
export function makeUSDZ(d, showNet = true) {
  const enc = new TextEncoder(), name=enc.encode('court.usda'), data=enc.encode(makeUSDA(d,showNet));
  let crc=0xffffffff;
  for(const byte of data) { crc ^= byte; for(let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
  crc=(crc^0xffffffff)>>>0;
  const extra=64-30-name.length, central=64+data.length, centralSize=46+name.length;
  const bytes=new Uint8Array(central+centralSize+22), v=new DataView(bytes.buffer);
  const u16=(p,n)=>v.setUint16(p,n,true), u32=(p,n)=>v.setUint32(p,n,true);
  u32(0,0x04034b50); u16(4,20); u16(12,33); u32(14,crc); u32(18,data.length); u32(22,data.length); u16(26,name.length); u16(28,extra);
  bytes.set(name,30); u16(30+name.length,0x1986); u16(32+name.length,extra-4); bytes.set(data,64);
  u32(central,0x02014b50); u16(central+4,20); u16(central+6,20); u16(central+14,33); u32(central+16,crc); u32(central+20,data.length); u32(central+24,data.length); u16(central+28,name.length); bytes.set(name,central+46);
  const end=central+centralSize; u32(end,0x06054b50); u16(end+8,1); u16(end+10,1); u32(end+12,centralSize); u32(end+16,central);
  return bytes;
}
