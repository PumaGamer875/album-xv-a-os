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
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});

// ========== ESTADO GLOBAL ==========
const estado = {
    paginaActual: 0,
    porPagina: 12,
    tipoFiltro: 'todos',
    archivosParaSubir: [],
    cargando: false,
    todasLasFotos: [], // Para el visor
    observerVideos: null // Para autoplay
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
    totalFotos: document.getElementById('total-fotos'),
    totalVideos: document.getElementById('total-videos'),
    totalRecuerdos: document.getElementById('total-recuerdos'),
    contadorResultados: document.getElementById('contadorResultados'),
    btnSubirFooter: document.getElementById('btnSubirFooter'),
    // Visor
    visor: document.getElementById('visorFotos'),
    visorImagen: document.getElementById('visorImagen'),
    visorVideo: document.getElementById('visorVideo'),
    visorTitulo: document.getElementById('visorTitulo'),
    visorDescripcion: document.getElementById('visorDescripcion'),
    visorFecha: document.getElementById('visorFecha'),
    visorActual: document.getElementById('visorActual'),
    visorTotal: document.getElementById('visorTotal'),
    visorCerrar: document.getElementById('visorCerrar'),
    visorAnterior: document.getElementById('visorAnterior'),
    visorSiguiente: document.getElementById('visorSiguiente')
};

// ========== VARIABLES VISOR ==========
let fotosVisor = [];
let indiceVisor = 0;
let inicioX = 0;

// ========== INICIALIZAR APP ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando álbum XV años...');
    console.log('📡 URL Supabase:', SUPABASE_URL);
    
    inicializarApp().catch(error => {
        console.error('❌ Error inicializando app:', error);
        mostrarErrorInicial();
    });
    
    // Ejecutar prueba de conexión
    probarConexion();
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
        console.log('⚙️ Cargando configuración...');
        const { data: config, error } = await supabase
            .from('configuracion')
            .select('*');

        if (error) throw error;

        console.log('✅ Configuración cargada:', config);

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
        } else {
            elementos.tituloPortada.textContent = 'Álbum XV Años';
            elementos.subtituloPortada.textContent = 'Bienvenido a mis recuerdos';
        }
    } catch (error) {
        console.error('❌ Error cargando configuración:', error);
        elementos.tituloPortada.textContent = 'Álbum XV Años';
        elementos.subtituloPortada.textContent = 'Recuerdos para siempre';
    }
}

// ========== CONFIGURACIÓN DE EVENTOS ==========
function configurarEventos() {
    // Modal de subida
    elementos.btnMostrarSubir.addEventListener('click', mostrarModalSubir);
    elementos.btnSubirFooter.addEventListener('click', mostrarModalSubir);
    elementos.btnCerrarModal.addEventListener('click', cerrarModal);
    elementos.modalSubir.addEventListener('click', (e) => {
        if (e.target === elementos.modalSubir) cerrarModal();
    });

    // Selección de archivos
    elementos.dropZone.addEventListener('click', () => elementos.fileInput.click());
    elementos.fileInput.addEventListener('change', manejarSeleccionArchivos);

    // Drag & Drop
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
            cargarGaleria().then(() => {
                if (estado.tipoFiltro === 'todos') {
                    manejarAutoplayVideos();
                }
            });
        });
    });

    // Cargar más
    elementos.btnCargarMas.addEventListener('click', () => {
        estado.paginaActual++;
        cargarGaleria();
    });
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

function prevenirDefault(e) {
    e.preventDefault();
    e.stopPropagation();
}

// ========== MANEJO DE ARCHIVOS ==========
function manejarDrop(e) {
    const archivos = Array.from(e.dataTransfer.files);
    procesarArchivos(archivos);
}

function manejarSeleccionArchivos(e) {
    const archivos = Array.from(e.target.files);
    procesarArchivos(archivos);
}

function procesarArchivos(archivos) {
    archivos.forEach(archivo => {
        const validacion = validarArchivo(archivo);
        
        if (!validacion.valido) {
            alert(`❌ Error en "${archivo.name}":\n\n• ${validacion.errores.join('\n• ')}`);
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
        errores.push(`Tipo de archivo no permitido: ${archivo.type}`);
    }
    
    // Validar tamaño
    const maxBytes = CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (archivo.size > maxBytes) {
        const tamañoMB = (archivo.size / (1024 * 1024)).toFixed(2);
        errores.push(`Tamaño excede ${CONFIG.MAX_FILE_SIZE_MB}MB (actual: ${tamañoMB}MB)`);
    }
    
    // Validar nombre
    if (archivo.name.length > 100) {
        errores.push('Nombre de archivo muy largo (máx. 100 caracteres)');
    }
    
    return {
        valido: errores.length === 0,
        errores: errores
    };
}

function actualizarPreviewArchivos() {
    elementos.previewArchivos.innerHTML = '';

    estado.archivosParaSubir.forEach((archivo, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.title = archivo.name;

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

    elementos.btnSubmit.disabled = estado.archivosParaSubir.length === 0;
}

// ========== SUBIDA DE ARCHIVOS ==========
async function manejarSubmit(e) {
    e.preventDefault();
    
    if (estado.archivosParaSubir.length === 0) {
        alert('📁 Por favor, selecciona al menos un archivo.');
        return;
    }

    if (estado.cargando) return;
    
    estado.cargando = true;
    elementos.btnSubmit.disabled = true;
    elementos.progresoContenedor.style.display = 'block';
    elementos.progresoBar.style.width = '0%';
    elementos.progresoTexto.textContent = 'Preparando subida...';

    const titulo = document.getElementById('titulo').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();

    let subidasExitosas = 0;
    const totalArchivos = estado.archivosParaSubir.length;

    for (let i = 0; i < estado.archivosParaSubir.length; i++) {
        const archivo = estado.archivosParaSubir[i];
        const tipo = archivo.type.startsWith('image/') ? 'foto' : 'video';

        try {
            // Generar nombre único
            const extension = archivo.name.split('.').pop();
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

            // Guardar en base de datos
            const { error: dbError } = await supabase
                .from('fotos')
                .insert({
                    url: urlData.publicUrl,
                    tipo: tipo,
                    titulo: titulo || null,
                    descripcion: descripcion || null
                });

            if (dbError) throw dbError;

            subidasExitosas++;

            // Actualizar progreso
            const progreso = Math.round((subidasExitosas / totalArchivos) * 100);
            elementos.progresoBar.style.width = `${progreso}%`;
            elementos.progresoTexto.textContent = `Subiendo... ${subidasExitosas}/${totalArchivos}`;

        } catch (error) {
            console.error('❌ Error subiendo archivo:', error);
            alert(`Error al subir "${archivo.name}": ${error.message}`);
        }
    }

    elementos.progresoTexto.textContent = `✅ ¡Listo! ${subidasExitosas} archivos subidos exitosamente.`;
    elementos.btnSubmit.disabled = false;
    estado.cargando = false;

    // Resetear y actualizar después de 2 segundos
    setTimeout(() => {
        resetearFormulario();
        cerrarModal();
        estado.paginaActual = 0;
        elementos.contenedorGaleria.innerHTML = '';
        cargarGaleria();
        actualizarEstadisticas();
    }, 2000);
}

function resetearFormulario() {
    elementos.formSubir.reset();
    estado.archivosParaSubir = [];
    actualizarPreviewArchivos();
    elementos.progresoContenedor.style.display = 'none';
}

// ========== GALERÍA Y VISOR ==========
async function cargarGaleria() {
    try {
        elementos.btnCargarMas.disabled = true;
        elementos.btnCargarMas.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';

        // Obtener TODAS las fotos para el visor y filtros
        let queryAll = supabase
            .from('fotos')
            .select('*')
            .order('created_at', { ascending: false });

        const { data: todasLasFotos, error: errorAll } = await queryAll;
        if (errorAll) throw errorAll;

        estado.todasLasFotos = todasLasFotos;
        
        // Filtrar según tipo
        let fotosFiltradas = todasLasFotos;
        if (estado.tipoFiltro !== 'todos') {
            fotosFiltradas = todasLasFotos.filter(foto => foto.tipo === estado.tipoFiltro);
        }

        // Calcular paginación
        const inicio = estado.paginaActual * estado.porPagina;
        const fin = inicio + estado.porPagina;
        const fotosPagina = fotosFiltradas.slice(inicio, fin);

        // Actualizar contador
        elementos.contadorResultados.textContent = `${fotosFiltradas.length} recuerdos`;

        if (fotosPagina.length === 0 && estado.paginaActual === 0) {
            elementos.contenedorGaleria.innerHTML = `
                <div class="no-recuerdos" style="grid-column: 1/-1; text-align: center; padding: 50px;">
                    <i class="fas fa-images fa-4x" style="color: #ccc; margin-bottom: 20px;"></i>
                    <h3 style="color: #666; margin-bottom: 15px;">No hay recuerdos aún</h3>
                    <p style="color: #888;">¡Sé el primero en subir una foto o video!</p>
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
        fotosPagina.forEach((recuerdo, index) => {
            const indiceGlobal = inicio + index;
            const item = crearElementoRecuerdo(recuerdo, indiceGlobal, fotosFiltradas);
            elementos.contenedorGaleria.appendChild(item);
        });

        // Actualizar botón cargar más
        elementos.btnCargarMas.style.display = fotosPagina.length === estado.porPagina ? 'block' : 'none';
        elementos.btnCargarMas.disabled = false;
        elementos.btnCargarMas.innerHTML = '<i class="fas fa-sync-alt"></i> Cargar más recuerdos';

        // Manejar autoplay de videos si estamos en vista "todos"
        if (estado.tipoFiltro === 'todos') {
            manejarAutoplayVideos();
        }

    } catch (error) {
        console.error('❌ Error cargando galería:', error);
        elementos.contenedorGaleria.innerHTML = `
            <div class="error" style="grid-column: 1/-1; text-align: center; padding: 50px; color: #ff6b8b;">
                <i class="fas fa-exclamation-triangle fa-3x"></i>
                <h3>Error al cargar los recuerdos</h3>
                <p>Por favor, intenta nuevamente más tarde.</p>
            </div>
        `;
    }
}

function crearElementoRecuerdo(recuerdo, index, todasLasFotos) {
    const item = document.createElement('div');
    item.className = 'item-galeria';
    item.dataset.index = index;

    const tipoTexto = recuerdo.tipo === 'foto' ? 'Foto' : 'Video';
    const iconoTipo = recuerdo.tipo === 'foto' ? 'fa-camera' : 'fa-video';

    const fecha = new Date(recuerdo.created_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    item.innerHTML = `
        <div class="media-container">
            ${recuerdo.tipo === 'foto' 
                ? `<img src="${recuerdo.url}" alt="${recuerdo.titulo || 'Recuerdo'}" loading="lazy">`
                : `<video src="${recuerdo.url}" muted loop playsinline></video>`
            }
            <span class="tipo-badge"><i class="fas ${iconoTipo}"></i> ${tipoTexto}</span>
        </div>
        <div class="info-recuerdo">
            ${recuerdo.titulo ? `<h3>${recuerdo.titulo}</h3>` : ''}
            ${recuerdo.descripcion ? `<p>${recuerdo.descripcion}</p>` : ''}
            <div class="fecha">
                <i class="far fa-calendar-alt"></i> ${fecha}
            </div>
        </div>
    `;
    
    // Evento para abrir visor
    item.addEventListener('click', () => {
        abrirVisor(index, todasLasFotos);
    });

    return item;
}

// ========== SISTEMA DE VISOR ==========
function inicializarVisor() {
    // Cerrar visor
    elementos.visorCerrar.addEventListener('click', cerrarVisor);
    elementos.visor.addEventListener('click', (e) => {
        if (e.target === elementos.visor) cerrarVisor();
    });
    
    // Navegación
    elementos.visorAnterior.addEventListener('click', () => navegarVisor(-1));
    elementos.visorSiguiente.addEventListener('click', () => navegarVisor(1));
    
    // Navegación con teclado
    document.addEventListener('keydown', (e) => {
        if (!elementos.visor.classList.contains('mostrar')) return;
        
        if (e.key === 'Escape') cerrarVisor();
        if (e.key === 'ArrowLeft') navegarVisor(-1);
        if (e.key === 'ArrowRight') navegarVisor(1);
    });
    
    // Navegación con gestos táctiles
    elementos.visor.addEventListener('touchstart', (e) => {
        inicioX = e.touches[0].clientX;
    });
    
    elementos.visor.addEventListener('touchend', (e) => {
        const finX = e.changedTouches[0].clientX;
        manejarGesto(finX);
    });
}

function manejarGesto(finX) {
    const diferencia = inicioX - finX;
    const minDiferencia = 50;
    
    if (Math.abs(diferencia) > minDiferencia) {
        if (diferencia > 0) {
            navegarVisor(1); // Deslizó izquierda → siguiente
        } else {
            navegarVisor(-1); // Deslizó derecha → anterior
        }
    }
}

function abrirVisor(indice, todasLasFotos) {
    fotosVisor = todasLasFotos;
    indiceVisor = indice;
    
    mostrarRecuerdoVisor();
    elementos.visor.classList.add('mostrar');
    document.body.style.overflow = 'hidden';
    
    // Detener todos los videos en la galería
    document.querySelectorAll('.item-galeria video').forEach(video => {
        video.pause();
        video.currentTime = 0;
    });
}

function cerrarVisor() {
    elementos.visor.classList.remove('mostrar');
    document.body.style.overflow = '';
    
    // Pausar video del visor si está reproduciendo
    if (!elementos.visorVideo.paused) {
        elementos.visorVideo.pause();
    }
}

function navegarVisor(direccion) {
    indiceVisor += direccion;
    
    // Navegación circular
    if (indiceVisor < 0) indiceVisor = fotosVisor.length - 1;
    if (indiceVisor >= fotosVisor.length) indiceVisor = 0;
    
    mostrarRecuerdoVisor();
}

function mostrarRecuerdoVisor() {
    const recuerdo = fotosVisor[indiceVisor];
    
    if (recuerdo.tipo === 'foto') {
        elementos.visorImagen.src = recuerdo.url;
        elementos.visorImagen.style.display = 'block';
        elementos.visorVideo.style.display = 'none';
        elementos.visorVideo.src = '';
    } else {
        elementos.visorVideo.src = recuerdo.url;
        elementos.visorVideo.style.display = 'block';
        elementos.visorImagen.style.display = 'none';
        elementos.visorImagen.src = '';
        elementos.visorVideo.load();
    }
    
    // Mostrar información
    elementos.visorTitulo.textContent = recuerdo.titulo || 'Sin título';
    elementos.visorDescripcion.textContent = recuerdo.descripcion || '';
    
    const fecha = new Date(recuerdo.created_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    elementos.visorFecha.innerHTML = `<i class="far fa-calendar-alt"></i> ${fecha}`;
    
    // Actualizar contador
    elementos.visorActual.textContent = indiceVisor + 1;
    elementos.visorTotal.textContent = fotosVisor.length;
}

// ========== AUTOPLAY VIDEOS ==========
function manejarAutoplayVideos() {
    // Limpiar observer anterior si existe
    if (estado.observerVideos) {
        estado.observerVideos.disconnect();
    }

    const videos = document.querySelectorAll('.item-galeria video');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            
            if (entry.isIntersecting) {
                // Video visible - reproducir
                video.muted = true;
                video.play().catch(e => {
                    // Autoplay bloqueado, no hacer nada
                    console.log('Autoplay bloqueado para:', video.src);
                });
            } else {
                // Video no visible - pausar
                video.pause();
                video.currentTime = 0;
            }
        });
    }, {
        threshold: 0.5,
        rootMargin: '50px'
    });
    
    videos.forEach(video => {
        observer.observe(video);
    });
    
    estado.observerVideos = observer;
}

// ========== ESTADÍSTICAS ==========
async function actualizarEstadisticas() {
    try {
        const { count: totalFotos } = await supabase
            .from('fotos')
            .select('*', { count: 'exact', head: true })
            .eq('tipo', 'foto');

        const { count: totalVideos } = await supabase
            .from('fotos')
            .select('*', { count: 'exact', head: true })
            .eq('tipo', 'video');

        const total = (totalFotos || 0) + (totalVideos || 0);
        
        elementos.totalFotos.innerHTML = `<i class="fas fa-camera"></i> Fotos: ${totalFotos || 0}`;
        elementos.totalVideos.innerHTML = `<i class="fas fa-video"></i> Videos: ${totalVideos || 0}`;
        elementos.totalRecuerdos.innerHTML = `<i class="fas fa-images"></i> Total: ${total}`;

    } catch (error) {
        console.error('❌ Error estadísticas:', error);
    }
}

// ========== MANEJO DE ERRORES ==========
function mostrarErrorInicial() {
    elementos.tituloPortada.textContent = '⚠️ Configuración Requerida';
    elementos.subtituloPortada.textContent = 'Verifica la configuración de Supabase';
    
    elementos.contenedorGaleria.innerHTML = `
        <div style="text-align: center; padding: 50px; max-width: 800px; margin: 0 auto;">
            <h3 style="color: #ff6b8b; margin-bottom: 20px;">Error de configuración</h3>
            <p style="margin-bottom: 20px;">Verifica en la consola del navegador los errores.</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: left;">
                <p><strong>Posibles problemas:</strong></p>
                <ul style="margin-top: 10px;">
                    <li>Credenciales de Supabase incorrectas</li>
                    <li>Tablas no creadas en la base de datos</li>
                    <li>Políticas de seguridad no configuradas</li>
                    <li>Bucket de Storage no creado</li>
                </ul>
            </div>
        </div>
    `;
}

// ========== PRUEBA DE CONEXIÓN ==========
async function probarConexion() {
    try {
        console.log('🔍 Probando conexión a Supabase...');
        const { data, error } = await supabase.from('configuracion').select('count');
        
        if (error) {
            console.error('❌ Error de conexión:', error.message);
            console.log('💡 Asegúrate de:');
            console.log('1. Haber creado las tablas en SQL Editor');
            console.log('2. Configurar las políticas de seguridad');
            console.log('3. Crear el bucket "fotos-album" en Storage');
            return false;
        }
        
        console.log('✅ Conexión exitosa a Supabase');
        return true;
    } catch (err) {
        console.error('❌ Error general:', err);
        return false;
    }
}

// ========== CARGA DE FUENTES Y RECURSOS ==========
function cargarFuentes() {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
}

// Inicializar fuentes
cargarFuentes();
