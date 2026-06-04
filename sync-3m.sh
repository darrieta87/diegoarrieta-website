#!/bin/bash
# sync-3m.sh — Sincroniza dashboards publicados desde carpeta 3M (Google Drive)
# Solo actualiza archivos que YA están publicados. No agrega nuevos.
# Inyecta el PIN gate automáticamente (las fuentes en 3M no lo tienen).

set -euo pipefail

REPO="/Users/das/dev/diego arrieta website/diegoarrieta-website"
DRIVE="/Users/das/Library/CloudStorage/GoogleDrive-darrieta87@gmail.com/My Drive/3M"
DEST="$REPO/clientes/tres-marias"

PIN_GATE=$(mktemp)
trap 'rm -f "$PIN_GATE"' EXIT

cat > "$PIN_GATE" << 'GATE'

<!-- ===== PIN GATE (protección ligera, lado cliente) ===== -->
<style>
  #pinGate{position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#1a5c2e 0%,#0d3d1c 100%);display:flex;align-items:center;justify-content:center;padding:20px;}
  #pinGate .pin-box{background:#fff;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.3);padding:32px 28px;max-width:340px;width:100%;text-align:center;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;}
  #pinGate h2{font-size:19px;color:#1a5c2e;margin-bottom:6px;font-weight:700;}
  #pinGate p.sub{font-size:13px;color:#666;margin-bottom:18px;}
  #pinGate input{width:100%;font-size:26px;letter-spacing:10px;text-align:center;padding:12px;border:2px solid #e0e0e0;border-radius:10px;outline:none;font-variant-numeric:tabular-nums;}
  #pinGate input:focus{border-color:#2d8a4e;}
  #pinGate button{margin-top:14px;width:100%;background:#1a5c2e;color:#fff;border:none;border-radius:10px;padding:12px;font-size:15px;font-weight:700;cursor:pointer;transition:background .15s;}
  #pinGate button:hover{background:#2d8a4e;}
  #pinGate .err{color:#c62828;font-size:13px;height:18px;margin-top:10px;}
  body.locked{overflow:hidden;}
</style>
<div id="pinGate">
  <div class="pin-box">
    <h2>Club de Golf Tres Marías</h2>
    <p class="sub">Ingresa el PIN para ver el dashboard</p>
    <input id="pinInput" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="••••">
    <div class="err" id="pinErr"></div>
    <button type="button" id="pinBtn">Entrar</button>
  </div>
</div>
<script>
(function(){
  var PIN="0717", KEY="3m_pin_ok";
  function unlock(){
    var g=document.getElementById('pinGate');
    if(g) g.style.display='none';
    document.body.classList.remove('locked');
    window.dispatchEvent(new Event('resize'));
  }
  if(sessionStorage.getItem(KEY)==="1"){ unlock(); return; }
  document.body.classList.add('locked');
  function tryPin(){
    var inp=document.getElementById('pinInput');
    if(inp.value.trim()===PIN){ sessionStorage.setItem(KEY,"1"); unlock(); }
    else { document.getElementById('pinErr').textContent='PIN incorrecto'; inp.value=''; inp.focus(); }
  }
  document.getElementById('pinBtn').addEventListener('click',tryPin);
  document.getElementById('pinInput').addEventListener('keydown',function(e){ if(e.key==='Enter') tryPin(); });
  window.addEventListener('load',function(){ var i=document.getElementById('pinInput'); if(i) i.focus(); });
})();
</script>
<!-- ===== /PIN GATE ===== -->
GATE

# Mapeo: "ruta_relativa_3M|ruta_relativa_destino"
MAPS=(
  "datos/temperatura-albercas/dashboards/dashboard-temp-albercas.html|temp-albercas.html"
  "datos/accesos-socios/dashboards/dashboard-accesos-abril-2026.html|accesos-abril-2026.html"
  "entregables/diagnostico-enrique-mayo2026.html|diagnostico-mayo-2026.html"
  "soluciones/master-app/demo-app-socios.html|master-app/demo.html"
  "datos/ventas-centros-consumo/dashboards/dashboard-ventas-cc.html|ventas-cc.html"
)

updated=0
skipped=0

echo "Sincronizando dashboards 3M → diegoarrieta.com"
echo "================================================"
echo ""

for entry in "${MAPS[@]}"; do
  IFS='|' read -r src_rel dst_rel <<< "$entry"
  src="$DRIVE/$src_rel"
  dst="$DEST/$dst_rel"

  if [[ ! -f "$src" ]]; then
    echo "  ⚠  Fuente no encontrada: $src_rel"
    ((skipped++))
    continue
  fi

  if [[ ! -f "$dst" ]]; then
    echo "  ⚠  No publicado (ignorado): $dst_rel"
    ((skipped++))
    continue
  fi

  sed "/<body/r $PIN_GATE" "$src" > "$dst.tmp"

  if ! diff -q "$dst" "$dst.tmp" > /dev/null 2>&1; then
    mv "$dst.tmp" "$dst"
    echo "  ✓  Actualizado: $dst_rel"
    ((updated++))
  else
    rm "$dst.tmp"
    echo "  ·  Sin cambios: $dst_rel"
  fi
done

echo ""

if [[ $updated -gt 0 ]]; then
  cd "$REPO"
  git add clientes/tres-marias/
  git commit -m "Sync $updated dashboard(s) desde 3M"
  git push
  echo "✓  Push completado — $updated archivo(s) actualizado(s)"
else
  echo "Todo al día, nada que sincronizar."
fi
