import { dimensions, makeUSDZ } from './court.mjs';
const $ = id => document.getElementById(id);
const precise = value => new Intl.NumberFormat('es', {maximumFractionDigits:3}).format(value);
const format = value => new Intl.NumberFormat('es', {maximumFractionDigits:2}).format(value);
const length=$('length'), net=$('net-height'), showNet=$('show-net'), ar=$('ar-link'), download=$('download');
let modelURL;
const supportsAR = !!ar.relList?.supports?.('ar');
$('unsupported').hidden=supportsAR;
$('prepare').hidden=supportsAR;
if (!supportsAR) $('prepare-label').textContent='Preparar modelo';
function invalidate() {
  ar.hidden=true; download.hidden=true;
  ar.removeAttribute('href'); download.removeAttribute('href');
  if(modelURL) { URL.revokeObjectURL(modelURL); modelURL=undefined; }
  $('status').textContent='';
}
function update() {
  invalidate();
  if(!length.checkValidity()) {
    $('status').textContent='Escribe un largo entre 6 y 18 m, con hasta dos decimales.';
    return;
  }
  const d=dimensions(length.valueAsNumber,Number(net.value));
  $('scale').value=d.length;
  const offset=220/d.width;
  $('post-top').setAttribute('cy',125-offset);
  $('post-bottom').setAttribute('cy',345+offset);
  $('post-axis').setAttribute('d',`M330 ${125-offset}V${345+offset}`);
  $('post-label').setAttribute('y',Math.max(405,360+offset));
  $('width').textContent=precise(d.width);
  $('plan-length').textContent=`${format(d.length)} m`;
  $('plan-width').textContent=`${precise(d.width)} m`;
  $('svg-title').textContent=`Cancha de vóley de ${format(d.length)} por ${precise(d.width)} metros`;
  $('attack-left').textContent=$('attack-right').textContent=`${format(d.attack)} m`;
  $('scale-badge').textContent=`ESCALA ${format(d.scale*100)} %`;
  $('diagonal').textContent=`${format(d.diagonal)} m`;
  $('posts').textContent=`${format(d.width+2)} m`;
  $('area').textContent=`${format(d.length*d.width)} m²`;
  $('size-note').textContent=d.length===18?'Medida oficial de juego · proporción 2:1.':'Tamaño recreativo reducido · conserva proporción 2:1; no es reglamentario.';
  if(supportsAR) prepareModel();
}
length.addEventListener('input',update);
$('scale').addEventListener('input',e=>{length.value=e.target.value;update();});
$('reset').addEventListener('click',()=>{length.value=18;update();});
net.addEventListener('change',update); showNet.addEventListener('change',update);
function prepareModel() {
  if(!$('settings-form').reportValidity()) return;
  invalidate();
  try {
    const d=dimensions(length.valueAsNumber,Number(net.value));
    const blob=new Blob([makeUSDZ(d,showNet.checked)],{type:'model/vnd.usdz+zip'});
    modelURL=URL.createObjectURL(blob);
    ar.href=`${modelURL}#allowsContentScaling=0`;
    ar.hidden=!supportsAR;
    download.href=modelURL;
    download.download=`cancha-${d.length}x${d.width}-red-${d.netHeight}.usdz`;
    download.hidden=false;
    $('status').textContent=`${format(d.length)} × ${precise(d.width)} m · tamaño fijo`;
    download.hidden=supportsAR;
  } catch(error) {
    invalidate();
    $('status').textContent='No se pudo preparar el modelo. Vuelve a intentarlo.';
    console.error(error);
  }
}
$('settings-form').addEventListener('submit', e => { e.preventDefault(); prepareModel(); });
update();
