// ═══════════════════════════════════════════════════════════════
// MAP — mapa de cidadãos (Leaflet + MarkerCluster)
// Extraído do app.js (Fase 11 da modularização)
//
// map/markers ficam encapsulados aqui. O elemento #map-modal é
// consultado direto via getElementById (mesmo padrão de
// cidadaos.js/reports.js) em vez de depender de referência
// cacheada por app.js.
// ═══════════════════════════════════════════════════════════════

import { sb } from './config.js';

let map = null;
let markers = [];

function initializeMap() {
    if (map) { map.remove(); }
    map = L.map('map').setView([-0.03964, -51.18182], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    markers = [];
}

export async function openMapModal(cidadaosToPlot = null) {
    const mapModal = document.getElementById('map-modal');
    mapModal.classList.remove('hidden');
    if (!map) {
        initializeMap();
        await new Promise(resolve => setTimeout(resolve, 200));
    } else {
        markers.forEach(m => { try { m.remove(); } catch(e) {} });
        markers = [];
        // Remove cluster anterior se existir
        if (map._clusterGroup) { map.removeLayer(map._clusterGroup); map._clusterGroup = null; }
    }
    if (map) map.invalidateSize();

    // PERFORMANCE: se não recebeu lista específica, busca só cidadãos com coordenadas do servidor
    let cidadaos = cidadaosToPlot;
    if (!cidadaos) {
        const { data } = await sb
            .from('cidadaos')
            .select('id, name, type, latitude, longitude, logradouro, numero')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .limit(5000); // limite razoável para o mapa
        cidadaos = data || [];
    }

    const bounds = [];
    // PERFORMANCE: usa MarkerClusterGroup se disponível, senão marcadores normais
    const useCluster = typeof L.markerClusterGroup === 'function';
    const clusterGroup = useCluster ? L.markerClusterGroup({ chunkedLoading: true }) : null;
    if (clusterGroup) { map._clusterGroup = clusterGroup; }

    for (const cidadao of cidadaos) {
        if (cidadao.latitude && cidadao.longitude) {
            try {
                const latLng = [parseFloat(cidadao.latitude), parseFloat(cidadao.longitude)];
                const marker = L.marker(latLng);
                const popupEl = document.createElement('div');
                const nameEl = document.createElement('strong');
                nameEl.textContent = cidadao.name;
                const typeEl = document.createElement('span');
                typeEl.textContent = ' — ' + cidadao.type;
                popupEl.appendChild(nameEl);
                popupEl.appendChild(typeEl);
                marker.bindPopup(popupEl);
                if (clusterGroup) { clusterGroup.addLayer(marker); } else { marker.addTo(map); }
                markers.push(marker);
                bounds.push(latLng);
            } catch (error) { console.warn(error); }
        }
    }
    if (clusterGroup) map.addLayer(clusterGroup);

    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    } else {
        map.setView([-0.03964, -51.18182], 13);
    }
}

export function closeMapModal() {
    document.getElementById('map-modal').classList.add('hidden');
}
