// ========== CONFIGURACIÓN SUPABASE ==========
// ¡REEMPLAZA EL ANON KEY CON TU LLAVE REAL!
const SUPABASE_URL = 'https://tvqwbvdzjtyzsfegyuzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cXdidmR6anR5enNmZWd5dXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjE5MDMsImV4cCI6MjA4MDQ5NzkwM30.JnE9FJFoeaULaddBWgXigGmvuKY56FjWID0fsAGkmgI';

// ========== INICIALIZACIÓN ==========
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== ESTADO ==========
const estado = {
    paginaActual: 0,
    porPagina: 12,
    tipoFiltro: 'todos',
    archivosParaSubir: [],
    cargando: false
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
    totalRecuerdos: document.getElementById('total-recuerdos')
};


// ========== INICIALIZAR APP ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('Iniciando aplicación...');
    console.log('URL Supabase:', SUPABASE_URL);
    console.log('Anon Key:', SUPABASE_ANON_KEY ? 'Configurada' : 'Falta');
    
    inicializarApp().catch(error => {
        console.error('Error inicializando app:', error);
        mostrarErrorInicial();
    });
});

async function inicializarApp() {
    await cargarConfiguracion();
    await cargarGaleria();
    configurarEventos();
    await actualizarEstadisticas();
}

// ========== CONFIGURACIÓN PORTADA ==========
async function cargarConfiguracion() {
    try {
        console.log('Cargando configuración...');
        const { data: config, error } = await supabase
            .from('configuracion')
            .select('*');

        if (error) {
            console.error('Error Supabase:', error);
            throw error;
        }

        console.log('Configuración cargada:', config);

        if (config && config.length > 0) {
            config.forEach(item => {
                switch(item.clave) {
                    case 'portada_url':
                        if (item.valor) {
                            elementos.portada.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url('${item.valor}')`;
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
            // Configuración por defecto
            elementos.tituloPortada.textContent = 'Álbum XV Años';
            elementos.subtituloPortada.textContent = 'Bienvenido a mis recuerdos';
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
        elementos.tituloPortada.textContent = 'Álbum XV Años';
        elementos.subtituloPortada.textContent = 'Configura la base de datos';
    }
}

// ========== FUNCIONES DE SUBIDA ==========
function configurarEventos() {
    // Modal
    elementos.btnMostrarSubir.addEventListener('click', () => {
        elementos.modalSubir.classList.add('mostrar');
    });

    elementos.btnCerrarModal.addEventListener('click', cerrarModal);
    elementos.modalSubir.addEventListener('click', (e) => {
        if (e.target === elementos.modalSubir) cerrarModal();
    });

    // Archivos
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

    // Formulario
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

function manejarSeleccionArchivos(e) {
    const archivos = Array.from(e.target.files);
    procesarArchivos(archivos);
}

function procesarArchivos(archivos) {
    archivos.forEach(archivo => {
        // Validar tipo de archivo
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 
                                'video/mp4', 'video/webm', 'video/ogg'];
        
        if (!tiposPermitidos.includes(archivo.type)) {
            alert(`❌ Tipo no permitido: "${archivo.name}"\n\nTipos aceptados:\n• Fotos: JPG, PNG, GIF, WebP\n• Videos: MP4, WebM, OGG`);
            return;
        }

        // Validar tamaño (50MB máximo)
        const maxSizeMB = 50;
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        
        if (archivo.size > maxSizeBytes) {
            const tamañoActualMB = (archivo.size / (1024 * 1024)).toFixed(2);
            alert(`📏 Archivo muy grande: "${archivo.name}"\n\nTamaño actual: ${tamañoActualMB} MB\nLímite máximo: ${maxSizeMB} MB`);
            return;
        }

        estado.archivosParaSubir.push(archivo);
    });

    actualizarPreviewArchivos();
    elementos.fileInput.value = '';
}

function actualizarPreviewArchivos() {
    elementos.previewArchivos.innerHTML = '';

    estado.archivosParaSubir.forEach((archivo, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';

        if (archivo.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(archivo);
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
        btnEliminar.addEventListener('click', () => {
            estado.archivosParaSubir.splice(index, 1);
            actualizarPreviewArchivos();
        });

        previewItem.appendChild(btnEliminar);
        elementos.previewArchivos.appendChild(previewItem);
    });

    elementos.btnSubmit.disabled = estado.archivosParaSubir.length === 0;
}

async function manejarSubmit(e) {
    e.preventDefault();
    
    if (estado.archivosParaSubir.length === 0) {
        alert('Selecciona al menos un archivo.');
        return;
    }

    if (estado.cargando) return;
    
    estado.cargando = true;
    elementos.btnSubmit.disabled = true;
    elementos.progresoContenedor.style.display = 'block';
    elementos.progresoBar.style.width = '0%';
    elementos.progresoTexto.textContent = 'Preparando...';

    const titulo = document.getElementById('titulo').value;
    const descripcion = document.getElementById('descripcion').value;

    let subidasExitosas = 0;
    const totalArchivos = estado.archivosParaSubir.length;

    for (let i = 0; i < estado.archivosParaSubir.length; i++) {
        const archivo = estado.archivosParaSubir[i];
        const tipo = archivo.type.startsWith('image/') ? 'foto' : 'video';

        try {
            // Subir a Storage
            const nombreArchivo = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${archivo.name.replace(/\s/g, '_')}`;
            
            const { error: uploadError } = await supabase.storage
                .from('fotos-album')
                .upload(nombreArchivo, archivo);

            if (uploadError) throw uploadError;

            // Obtener URL pública
            const { data: urlData } = supabase.storage
                .from('fotos-album')
                .getPublicUrl(nombreArchivo);

            // Guardar en BD
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
            console.error('Error subiendo:', error);
            alert(`Error con "${archivo.name}": ${error.message}`);
        }
    }

    elementos.progresoTexto.textContent = `¡Listo! ${subidasExitosas} archivos subidos.`;
    elementos.btnSubmit.disabled = false;
    estado.cargando = false;

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

function cerrarModal() {
    elementos.modalSubir.classList.remove('mostrar');
    resetearFormulario();
}

// ========== GALERÍA ==========
async function cargarGaleria() {
    try {
        elementos.btnCargarMas.disabled = true;
        elementos.btnCargarMas.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';

        let query = supabase
            .from('fotos')
            .select('*')
            .order('created_at', { ascending: false })
            .range(
                estado.paginaActual * estado.porPagina,
                (estado.paginaActual * estado.porPagina) + estado.porPagina - 1
            );

        if (estado.tipoFiltro !== 'todos') {
            query = query.eq('tipo', estado.tipoFiltro);
        }

        const { data: recuerdos, error } = await query;

        if (error) throw error;

        if (recuerdos.length === 0 && estado.paginaActual === 0) {
            elementos.contenedorGaleria.innerHTML = `
                <div class="no-recuerdos" style="grid-column: 1/-1; text-align: center; padding: 50px;">
                    <i class="fas fa-images fa-4x" style="color: #ccc; margin-bottom: 20px;"></i>
                    <h3 style="color: #666; margin-bottom: 15px;">No hay recuerdos aún</h3>
                    <p style="color: #888;">¡Sube la primera foto o video!</p>
                </div>
            `;
            elementos.btnCargarMas.style.display = 'none';
            return;
        }

        recuerdos.forEach(recuerdo => {
            const item = crearElementoRecuerdo(recuerdo);
            elementos.contenedorGaleria.appendChild(item);
        });

        elementos.btnCargarMas.style.display = recuerdos.length === estado.porPagina ? 'block' : 'none';
        elementos.btnCargarMas.disabled = false;
        elementos.btnCargarMas.innerHTML = '<i class="fas fa-sync-alt"></i> Cargar más';

    } catch (error) {
        console.error('Error cargando galería:', error);
        elementos.contenedorGaleria.innerHTML = `
            <div class="error" style="grid-column: 1/-1; text-align: center; padding: 50px; color: #ff6b8b;">
                <h3>Error cargando recuerdos</h3>
                <p>Verifica la conexión o configuración.</p>
            </div>
        `;
    }
}

function crearElementoRecuerdo(recuerdo) {
    const item = document.createElement('div');
    item.className = 'item-galeria';

    const tipoTexto = recuerdo.tipo === 'foto' ? 'Foto' : 'Video';
    const iconoTipo = recuerdo.tipo === 'foto' ? 'fa-camera' : 'fa-video';

    const fecha = new Date(recuerdo.created_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    item.innerHTML = `
        <div class="media-container">
            ${recuerdo.tipo === 'foto' 
                ? `<img src="${recuerdo.url}" alt="${recuerdo.titulo || 'Recuerdo'}" loading="lazy">`
                : `<video src="${recuerdo.url}" controls></video>`
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

    return item;
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

        elementos.totalFotos.textContent = `Fotos: ${totalFotos || 0}`;
        elementos.totalVideos.textContent = `Videos: ${totalVideos || 0}`;
        elementos.totalRecuerdos.textContent = `Total: ${(totalFotos || 0) + (totalVideos || 0)}`;

    } catch (error) {
        console.error('Error estadísticas:', error);
    }
}

// ========== MANEJO DE ERRORES ==========
function mostrarErrorInicial() {
    elementos.tituloPortada.textContent = 'Error de Configuración';
    elementos.subtituloPortada.textContent = 'Revisa la consola para más detalles';
    
    elementos.contenedorGaleria.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <h3 style="color: #ff6b8b;">Error de configuración</h3>
            <p>Verifica que:</p>
            <ul style="text-align: left; display: inline-block;">
                <li>Las credenciales de Supabase sean correctas</li>
                <li>Las tablas estén creadas</li>
                <li>Las políticas de seguridad estén configuradas</li>
            </ul>
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
            return false;
        }
        
        console.log('✅ Conexión exitosa');
        return true;
    } catch (err) {
        console.error('❌ Error general:', err);
        return false;
    }
}

// Ejecutar prueba al cargar
probarConexion();

