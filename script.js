// ========== CONFIGURACIÓN SUPABASE ==========
const SUPABASE_URL = 'https://tvqwbvdzjtyzsfegyuzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cXdidmR6anR5enNmZWd5dXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjE5MDMsImV4cCI6MjA4MDQ5NzkwM30.JnE9FJFoeaULaddBWgXigGmvuKY56FjWID0fsAGkmgI';

// ========== CONFIGURACIÓN APP ==========
const CONFIG = {
    MAX_FILE_SIZE_MB: 50,
    ALLOWED_TYPES: {
        images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
        videos: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/mpeg']
    }
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
    filtrosBtn: document.querySelectorAll('.filtro-btn'),
    btnSubirFooter: document.getElementById('btnSubirFooter'),
    // Visor
    visor: document.getElementById('visorFotos'),
    visorImagen: document.getElementById('visorImagen'),
    visorVideo: document.getElementById('visorVideo'),
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

// ========== INICIALIZAR APP ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('📸 Iniciando álbum XV años...');
    
    // Detectar si es móvil
    if (esMovil()) {
        document.body.classList.add('es-movil');
        console.log('📱 Modo móvil detectado');
    }
    
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

    // Selección de archivos - FIX PARA MÓVILES (SIN CAPTURE)
    elementos.dropZone.addEventListener('click', () => {
        // Solo activar el input file original
        elementos.fileInput.click();
    });

    elementos.fileInput.addEventListener('change', manejarSeleccionArchivos);

    // Drag & Drop para desktop
    if (!esMovil()) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            elementos.dropZone.addEventListener(eventName, prevenirDefault, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            elementos.dropZone.addEventListener(eventName, () => {
                elementos.dropZone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            elementos.dropZone.addEventListener(eventName, () => {
                elementos.dropZone.classList.remove('dragover');
            }, false);
        });

        elementos.dropZone.addEventListener('drop', manejarDrop, false);
    }

    // Formulario de subida
    elementos.formSubir.addEventListener('submit', manejarSubmit);

    // Filtros
    elementos.filtrosBtn.forEach(btn => {
        btn.addEventListener('click', () => {
            elementos.filtrosBtn.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            estado.tipoFiltro = btn.dataset.tipo;
            estado.paginaActual = 0;
            elementos.contenedorGaleria.innerHTML = '';
            cargarGaleria();
        });
    });

    // Cargar más
    elementos.btnCargarMas.addEventListener('click', () => {
        estado.paginaActual++;
        cargarGaleria();
    });
}

function prevenirDefault(e) {
    e.preventDefault();
    e.stopPropagation();
}

function manejarDrop(e) {
    const archivos = Array.from(e.dataTransfer.files);
    procesarArchivos(archivos);
}

function mostrarModalSubir() {
    elementos.modalSubir.classList.add('mostrar');
    document.body.style.overflow = 'hidden';
}

function cerrarModal() {
    elementos.modalSubir.classList.remove('mostrar');
    document.body.style.overflow = '';
    resetearFormulario();
}

// ========== MANEJO DE ARCHIVOS ==========
function manejarSeleccionArchivos(e) {
    const archivos = Array.from(e.target.files);
    procesarArchivos(archivos);
}

function procesarArchivos(archivos) {
    archivos.forEach(archivo => {
        const validacion = validarArchivo(archivo);
        
        if (!validacion.valido) {
            alert(`❌ Error: "${archivo.name}"\n${validacion.errores.join('\n')}`);
            return;
        }

        estado.archivosParaSubir.push(archivo);
    });

    actualizarPreviewArchivos();
    elementos.fileInput.value = '';
}

function validarArchivo(archivo) {
    const errores = [];
    
    // Validar tipo
    const tiposPermitidos = [...CONFIG.ALLOWED_TYPES.images, ...CONFIG.ALLOWED_TYPES.videos];
    if (!tiposPermitidos.includes(archivo.type)) {
        errores.push('Tipo de archivo no permitido. Solo imágenes y videos');
    }
    
    // Validar tamaño
    const maxBytes = CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (archivo.size > maxBytes) {
        const tamañoMB = (archivo.size / (1024 * 1024)).toFixed(1);
        errores.push(`Muy grande: ${tamañoMB}MB (máximo: ${CONFIG.MAX_FILE_SIZE_MB}MB)`);
    }
    
    return {
        valido: errores.length === 0,
        errores: errores
    };
}

function actualizarPreviewArchivos() {
    elementos.previewArchivos.innerHTML = '';

    if (estado.archivosParaSubir.length === 0) {
        elementos.previewArchivos.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No hay archivos seleccionados</p>';
        elementos.btnSubmit.disabled = true;
        return;
    }

    estado.archivosParaSubir.forEach((archivo, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';

        if (archivo.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(archivo);
            img.alt = archivo.name;
            previewItem.appendChild(img);
        } else if (archivo.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(archivo);
            video.controls = true;
            previewItem.appendChild(video);
        }

        const btnEliminar = document.createElement('button');
        btnEliminar.className = 'eliminar';
        btnEliminar.innerHTML = '×';
        btnEliminar.title = 'Eliminar';
        btnEliminar.addEventListener('click', (e) => {
            e.stopPropagation();
            estado.archivosParaSubir.splice(index, 1);
            actualizarPreviewArchivos();
        });

        previewItem.appendChild(btnEliminar);
        elementos.previewArchivos.appendChild(previewItem);
    });

    elementos.btnSubmit.disabled = false;
    elementos.btnSubmit.innerHTML = `<i class="fas fa-paper-plane"></i> Subir ${estado.archivosParaSubir.length} archivo${estado.archivosParaSubir.length > 1 ? 's' : ''}`;
}

// ========== SUBIDA DE ARCHIVOS ==========
async function manejarSubmit(e) {
    e.preventDefault();
    
    if (estado.archivosParaSubir.length === 0) {
        alert('📁 Selecciona al menos un archivo');
        return;
    }

    if (estado.cargando) return;
    
    estado.cargando = true;
    elementos.btnSubmit.disabled = true;
    elementos.progresoContenedor.style.display = 'block';
    elementos.progresoBar.style.width = '0%';
    elementos.progresoTexto.textContent = 'Preparando...';

    let subidasExitosas = 0;
    const totalArchivos = estado.archivosParaSubir.length;

    for (let i = 0; i < estado.archivosParaSubir.length; i++) {
        const archivo = estado.archivosParaSubir[i];
        const tipo = archivo.type.startsWith('image/') ? 'foto' : 'video';

        try {
            // Generar nombre único
            const extension = archivo.name.split('.').pop().toLowerCase();
            const nombreArchivo = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
            
            // Subir a Storage
            const { error: uploadError } = await supabase.storage
                .from('fotos-album')
                .upload(nombreArchivo, archivo);

            if (uploadError) throw uploadError;

            // Obtener URL pública
            const { data: urlData } = supabase.storage
                .from('fotos-album')
                .getPublicUrl(nombreArchivo);

            // Guardar en base de datos (SIN TÍTULO NI DESCRIPCIÓN)
            const { error: dbError } = await supabase
                .from('fotos')
                .insert({
                    url: urlData.publicUrl,
                    tipo: tipo
                    // No incluir título ni descripción
                });

            if (dbError) throw dbError;

            subidasExitosas++;

            // Actualizar progreso
            const progreso = Math.round((subidasExitosas / totalArchivos) * 100);
            elementos.progresoBar.style.width = `${progreso}%`;
            elementos.progresoTexto.textContent = `Subiendo... ${subidasExitosas}/${totalArchivos}`;

        } catch (error) {
            console.error('❌ Error:', error);
            alert(`Error al subir "${archivo.name}"`);
        }
    }

    elementos.progresoTexto.textContent = `✅ ¡Listo! ${subidasExitosas} archivos subidos`;
    elementos.btnSubmit.disabled = false;
    estado.cargando = false;

    // Resetear y actualizar
    setTimeout(() => {
        resetearFormulario();
        cerrarModal();
        estado.paginaActual = 0;
        elementos.contenedorGaleria.innerHTML = '';
        cargarGaleria();
    }, 1500);
}

function resetearFormulario() {
    estado.archivosParaSubir = [];
    actualizarPreviewArchivos();
    elementos.progresoContenedor.style.display = 'none';
    elementos.btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> Subir Recuerdos';
}

// ========== GALERÍA Y VISOR ==========
async function cargarGaleria() {
    try {
        elementos.btnCargarMas.disabled = true;
        elementos.btnCargarMas.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';

        // Obtener TODAS las fotos/videos
        const { data: todasLasFotos, error } = await supabase
            .from('fotos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        estado.todasLasFotos = todasLasFotos;
        
        // Filtrar según tipo seleccionado
        let contenidoFiltrado = todasLasFotos;
        if (estado.tipoFiltro !== 'todos') {
            contenidoFiltrado = todasLasFotos.filter(item => item.tipo === estado.tipoFiltro);
        }
        
        // Calcular paginación
        const inicio = estado.paginaActual * estado.porPagina;
        const fin = inicio + estado.porPagina;
        const contenidoPagina = contenidoFiltrado.slice(inicio, fin);

        if (contenidoPagina.length === 0 && estado.paginaActual === 0) {
            elementos.contenedorGaleria.innerHTML = `
                <div class="no-recuerdos" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-images fa-3x" style="color: #ccc; margin-bottom: 15px;"></i>
                    <h3 style="color: #666; margin-bottom: 10px;">No hay recuerdos aún</h3>
                    <p style="color: #888;">¡Sube el primer recuerdo!</p>
                </div>
            `;
            elementos.btnCargarMas.style.display = 'none';
            return;
        }

        // Limpiar contenedor si es primera página
        if (estado.paginaActual === 0) {
            elementos.contenedorGaleria.innerHTML = '';
        }

        // Crear elementos
        contenidoPagina.forEach((item, index) => {
            const indiceGlobal = inicio + index;
            const elementoGaleria = crearElementoGaleria(item, indiceGlobal);
            elementos.contenedorGaleria.appendChild(elementoGaleria);
        });

        // Actualizar botón cargar más
        elementos.btnCargarMas.style.display = contenidoPagina.length === estado.porPagina ? 'block' : 'none';
        elementos.btnCargarMas.disabled = false;
        elementos.btnCargarMas.innerHTML = '<i class="fas fa-sync-alt"></i> Cargar más';

    } catch (error) {
        console.error('❌ Error cargando galería:', error);
        elementos.contenedorGaleria.innerHTML = `
            <div class="error" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ff6b8b;">
                <h3>Error al cargar los recuerdos</h3>
                <p>Intenta nuevamente</p>
            </div>
        `;
    }
}

function crearElementoGaleria(item, index) {
    const elemento = document.createElement('div');
    elemento.className = 'item-galeria';
    elemento.dataset.index = index;

    const tipoTexto = item.tipo === 'foto' ? 'Foto' : 'Video';
    const iconoTipo = item.tipo === 'foto' ? 'fa-camera' : 'fa-video';

    elemento.innerHTML = `
        ${item.tipo === 'foto' 
            ? `<img src="${item.url}" alt="Recuerdo ${index + 1}" loading="lazy">`
            : `<video src="${item.url}" muted playsinline></video>`
        }
        <span class="tipo-badge"><i class="fas ${iconoTipo}"></i> ${tipoTexto}</span>
    `;
    
    // Evento para abrir visor
    elemento.addEventListener('click', () => {
        abrirVisor(index);
    });

    // Para videos en galería, autoplay en hover (solo desktop)
    if (item.tipo === 'video' && !esMovil()) {
        const video = elemento.querySelector('video');
        elemento.addEventListener('mouseenter', () => {
            video.play().catch(e => console.log('Autoplay bloqueado'));
        });
        
        elemento.addEventListener('mouseleave', () => {
            video.pause();
            video.currentTime = 0;
        });
    }

    return elemento;
}

// ========== SISTEMA DE VISOR SIMPLIFICADO ==========
function inicializarVisor() {
    // Cerrar visor
    elementos.visorCerrar.addEventListener('click', cerrarVisor);
    elementos.visor.addEventListener('click', (e) => {
        if (e.target === elementos.visor || e.target.classList.contains('visor-contenido')) {
            cerrarVisor();
        }
    });
    
    // Navegación
    elementos.visorAnterior.addEventListener('click', () => navegarVisor(-1));
    elementos.visorSiguiente.addEventListener('click', () => navegarVisor(1));
    
    // Navegación con teclado
    document.addEventListener('keydown', (e) => {
        if (!elementos.visor.classList.contains('mostrar')) return;
        
        if (e.key === 'Escape' || e.key === ' ') cerrarVisor();
        if (e.key === 'ArrowLeft') navegarVisor(-1);
        if (e.key === 'ArrowRight') navegarVisor(1);
    });
    
    // Navegación con gestos táctiles
    elementos.visor.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    });
    
    elementos.visor.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        manejarGesto(touchEndX);
    });
}

function manejarGesto(touchEndX) {
    const minSwipeDistance = 50;
    const distance = touchStartX - touchEndX;
    
    if (Math.abs(distance) < minSwipeDistance) return;
    
    if (distance > 0) {
        // Swipe izquierda = siguiente
        navegarVisor(1);
    } else {
        // Swipe derecha = anterior
        navegarVisor(-1);
    }
}

function abrirVisor(indice) {
    // Filtrar según tipo seleccionado
    let contenidoFiltrado = estado.todasLasFotos;
    if (estado.tipoFiltro !== 'todos') {
        contenidoFiltrado = estado.todasLasFotos.filter(item => item.tipo === estado.tipoFiltro);
    }
    
    fotosVisor = contenidoFiltrado;
    
    // Encontrar el índice correcto en el contenido filtrado
    const itemSeleccionado = estado.todasLasFotos[indice];
    indiceVisor = fotosVisor.findIndex(item => item.id === itemSeleccionado.id);
    
    if (indiceVisor === -1) indiceVisor = 0;
    if (fotosVisor.length === 0) return;
    
    mostrarMediaVisor();
    elementos.visor.classList.add('mostrar');
    document.body.style.overflow = 'hidden';
}

function cerrarVisor() {
    elementos.visor.classList.remove('mostrar');
    document.body.style.overflow = '';
    
    // Pausar video si está reproduciendo
    if (!elementos.visorVideo.paused) {
        elementos.visorVideo.pause();
    }
}

function navegarVisor(direccion) {
    indiceVisor += direccion;
    
    // Navegación circular
    if (indiceVisor < 0) indiceVisor = fotosVisor.length - 1;
    if (indiceVisor >= fotosVisor.length) indiceVisor = 0;
    
    mostrarMediaVisor();
}

function mostrarMediaVisor() {
    const item = fotosVisor[indiceVisor];
    
    if (item.tipo === 'foto') {
        elementos.visorImagen.src = item.url;
        elementos.visorImagen.style.display = 'block';
        elementos.visorVideo.style.display = 'none';
        elementos.visorVideo.src = '';
    } else {
        elementos.visorVideo.src = item.url;
        elementos.visorVideo.style.display = 'block';
        elementos.visorImagen.style.display = 'none';
        elementos.visorImagen.src = '';
        elementos.visorVideo.load();
        elementos.visorVideo.play().catch(e => console.log('Autoplay bloqueado en visor'));
    }
    
    // Actualizar contador
    elementos.visorActual.textContent = indiceVisor + 1;
    elementos.visorTotal.textContent = fotosVisor.length;
}

// ========== DETECCIÓN DE DISPOSITIVO ==========
function esMovil() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ========== MANEJO DE ERRORES ==========
function mostrarErrorInicial() {
    elementos.tituloPortada.textContent = 'Álbum XV Años';
    elementos.subtituloPortada.textContent = 'Cargando...';
}

// Cargar fuentes
function cargarFuentes() {
    if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
}

cargarFuentes();
