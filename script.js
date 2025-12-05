// ========== CONFIGURACIÓN SUPABASE ==========
const SUPABASE_URL = 'https://tvqwbvdzjtyzsfegyuzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cXdidmR6anR5enNmZWd5dXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjE5MDMsImV4cCI6MjA4MDQ5NzkwM30.JnE9FJFoeaULaddBWgXigGmvuKY56FjWID0fsAGkmgI';

// ========== CONFIGURACIÓN APP ==========
const CONFIG = {
    MAX_FILE_SIZE_MB: 50,
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
};

// ========== INICIALIZACIÓN SUPABASE ==========
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== ESTADO GLOBAL ==========
const estado = {
    paginaActual: 0,
    porPagina: 12,
    tipoFiltro: 'todos',
    archivosParaSubir: [],
    cargando: false,
    todasLasFotos: []
};

// ========== ELEMENTOS DOM ==========
const elementos = {
    portada: document.getElementById('portada'),
    tituloPortada: document.getElementById('titulo-portada'),
    subtituloPortada: document.getElementById('subtitulo-portada'),
    modalSubir: document.getElementById('modalSubir'),
    formSubir: document.getElementById('formSubir'),
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    previewArchivos: document.getElementById('previewArchivos'),
    btnMostrarSubir: document.getElementById('btnMostrarSubir'),
    btnCerrarModal: document.getElementById('btnCerrarModal'),
    btnSubmit: document.getElementById('btnSubmit'),
    progresoContenedor: document.getElementById('progresoContenedor'),
    progresoBar: document.getElementById('progresoBar'),
    progresoTexto: document.getElementById('progresoTexto'),
    contenedorGaleria: document.getElementById('contenedor-galerias'),
    btnCargarMas: document.getElementById('btnCargarMas'),
    totalFotos: document.getElementById('total-fotos'),
    contadorResultados: document.getElementById('contadorResultados'),
    btnSubirFooter: document.getElementById('btnSubirFooter'),
    // Visor
    visor: document.getElementById('visorFotos'),
    visorImagen: document.getElementById('visorImagen'),
    visorActual: document.getElementById('visorActual'),
    visorTotal: document.getElementById('visorTotal'),
    visorCerrar: document.getElementById('visorCerrar'),
    visorAnterior: document.getElementById('visorAnterior'),
    visorSiguiente: document.getElementById('visorSiguiente')
};

// ========== VARIABLES VISOR ==========
let fotosVisor = [];
let indiceVisor = 0;
let touchStartX = 0;
let touchEndX = 0;

// ========== INICIALIZAR APP ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('📸 Iniciando álbum XV años...');
    
    // Configurar eventos táctiles
    configurarEventosTactiles();
    
    inicializarApp().catch(error => {
        console.error('❌ Error:', error);
        mostrarErrorInicial();
    });
});

async function inicializarApp() {
    await cargarConfiguracion();
    await cargarGaleria();
    configurarEventos();
    inicializarVisor();
    await actualizarEstadisticas();
}

// ========== CONFIGURACIÓN PORTADA ==========
async function cargarConfiguracion() {
    try {
        const { data: config, error } = await supabase
            .from('configuracion')
            .select('*');

        if (error) throw error;

        if (config && config.length > 0) {
            config.forEach(item => {
                switch(item.clave) {
                    case 'portada_url':
                        if (item.valor) {
                            elementos.portada.style.backgroundImage = `url('${item.valor}')`;
                        }
                        break;
                    case 'titulo_portada':
                        elementos.tituloPortada.textContent = item.valor || 'Mi XV Años';
                        break;
                    case 'subtitulo_portada':
                        elementos.subtituloPortada.textContent = item.valor || 'Álbum de Recuerdos';
                        break;
                }
            });
        }
    } catch (error) {
        console.error('❌ Error cargando configuración:', error);
    }
}

// ========== CONFIGURACIÓN DE EVENTOS ==========
function configurarEventos() {
    // Modal de subida
    elementos.btnMostrarSubir.addEventListener('click', mostrarModalSubir);
    elementos.btnSubirFooter.addEventListener('click', mostrarModalSubir);
    elementos.btnCerrarModal.addEventListener('click', cerrarModal);
    
    // Evitar cierre al hacer click dentro del modal
    elementos.modalSubir.querySelector('.modal-contenido').addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    elementos.modalSubir.addEventListener('click', (e) => {
        if (e.target === elementos.modalSubir) cerrarModal();
    });

    // Selección de archivos - SOLO PARA MÓVILES
    elementos.dropZone.addEventListener('click', () => {
        // En móviles, forzar el input file
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.capture = 'environment'; // Permitir usar cámara directamente
        input.style.display = 'none';
        
        input.onchange = (e) => {
            const archivos = Array.from(e.target.files);
            procesarArchivos(archivos);
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    });

    // También mantener el input original para desktop
    elementos.fileInput.addEventListener('change',
