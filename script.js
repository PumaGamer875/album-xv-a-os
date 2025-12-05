// Configuración de Supabase
const SUPABASE_URL = 'https://tvqwbvdzjtyzsfegyuzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cXdidmR6anR5enNmZWd5dXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjE5MDMsImV4cCI6MjA4MDQ5NzkwM30.JnE9FJFoeaULaddBWgXigGmvuKY56FjWID0fsAGkmgI';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado de la aplicación
const estado = {
    paginaActual: 0,
    porPagina: 12,
    tipoFiltro: 'todos',
    archivosParaSubir: [],
    cargando: false
};

// Elementos del DOM
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

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', inicializarApp);

async function inicializarApp() {
    await cargarConfiguracion();
    await cargarGaleria();
    configurarEventos();
    actualizarEstadisticas();
}

// ========== CONFIGURACIÓN DE PORTADA ==========
async function cargarConfiguracion() {
    try {
        const { data: config, error } = await supabase
            .from('configuracion')
            .select('*');

        if (error) throw error;

        config.forEach(item => {
            switch(item.clave) {
                case 'portada_url':
                    if (item.valor) {
                        elementos.portada.style.setProperty('--portada-imagen', `url('${item.valor}')`);
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
    } catch (error) {
        console.error('Error cargando configuración:', error);
        elementos.tituloPortada.textContent = 'Álbum XV Años';
        elementos.subtituloPortada.textContent = 'Bienvenido a mis recuerdos';
    }
}

// ========== SISTEMA DE SUBIDA ==========
function configurarEventos() {
    // Mostrar modal de subida
    elementos.btnMostrarSubir.addEventListener('click', () => {
        elementos.modalSubir.classList.add('mostrar');
    });

    // Cerrar modal
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
        elementos.dropZone.addEventListener(eventName, resaltarDropZone, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        elementos.dropZone.addEventListener(eventName, quitarResaltadoDropZone, false);
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

function resaltarDropZone() {
    elementos.dropZone.classList.add('dragover');
}

function quitarResaltadoDropZone() {
    elementos.dropZone.classList.remove('dragover');
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
        if (!archivo.type.startsWith('image/') && !archivo.type.startsWith('video/')) {
            alert(`El archivo "${archivo.name}" no es una imagen ni video válido.`);
            return;
        }

        // Validar tamaño (máximo 20MB)
        if (archivo.size > 20 * 1024 * 1024) {
            alert(`El archivo "${archivo.name}" es demasiado grande (máximo 20MB).`);
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

    // Actualizar estado del botón de submit
    elementos.btnSubmit.disabled = estado.archivosParaSubir.length === 0;
}

async function manejarSubmit(e) {
    e.preventDefault();
    
    if (estado.archivosParaSubir.length === 0) {
        alert('Por favor, selecciona al menos un archivo.');
        return;
    }

    if (estado.cargando) return;
    
    estado.cargando = true;
    elementos.btnSubmit.disabled = true;
    elementos.progresoContenedor.style.display = 'block';
    elementos.progresoBar.style.width = '0%';
    elementos.progresoTexto.textContent = 'Preparando subida...';

    const titulo = document.getElementById('titulo').value;
    const descripcion = document.getElementById('descripcion').value;

    let subidasExitosas = 0;
    const totalArchivos = estado.archivosParaSubir.length;

    for (let i = 0; i < estado.archivosParaSubir.length; i++) {
        const archivo = estado.archivosParaSubir[i];
        const tipo = archivo.type.startsWith('image/') ? 'foto' : 'video';

        try {
            // Subir a Storage de Supabase
            const nombreArchivo = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${archivo.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
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
            console.error('Error subiendo archivo:', error);
            alert(`Error al subir "${archivo.name}": ${error.message}`);
        }
    }

    // Finalizar
    elementos.progresoTexto.textContent = `¡Listo! ${subidasExitosas} archivos subidos exitosamente.`;
    elementos.btnSubmit.disabled = false;
    estado.cargando = false;

    // Resetear formulario después de 2 segundos
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
                    <p style="color: #888;">¡Sé el primero en subir una foto o video!</p>
                    <button class="btn-subir" onclick="document.getElementById('btnMostrarSubir').click()" 
                            style="margin-top: 20px;">
                        <i class="fas fa-cloud-upload-alt"></i> Subir el primer recuerdo
                    </button>
                </div>
            `;
            elementos.btnCargarMas.style.display = 'none';
            return;
        }

        // Mostrar recuerdos
        recuerdos.forEach(recuerdo => {
            const item = crearElementoRecuerdo(recuerdo);
            elementos.contenedorGaleria.appendChild(item);
        });

        // Mostrar/ocultar botón "Cargar más"
        elementos.btnCargarMas.style.display = recuerdos.length === estado.porPagina ? 'block' : 'none';
        elementos.btnCargarMas.disabled = false;
        elementos.btnCargarMas.innerHTML = '<i class="fas fa-sync-alt"></i> Cargar más recuerdos';

    } catch (error) {
        console.error('Error cargando galería:', error);
        elementos.contenedorGaleria.innerHTML = `
            <div class="error" style="grid-column: 1/-1; text-align: center; padding: 50px; color: #ff6b8b;">
                <i class="fas fa-exclamation-triangle fa-3x"></i>
                <h3>Error al cargar los recuerdos</h3>
                <p>Por favor, intenta nuevamente más tarde.</p>
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
                : `<video src="${recuerdo.url}" controls poster="${recuerdo.url}?thumb=1"></video>`
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
        // Contar fotos
        const { count: totalFotos, error: errorFotos } = await supabase
            .from('fotos')
            .select('*', { count: 'exact', head: true })
            .eq('tipo', 'foto');

        // Contar videos
        const { count: totalVideos, error: errorVideos } = await supabase
            .from('fotos')
            .select('*', { count: 'exact', head: true })
            .eq('tipo', 'video');

        if (errorFotos || errorVideos) throw errorFotos || errorVideos;

        elementos.totalFotos.textContent = `Fotos: ${totalFotos || 0}`;
        elementos.totalVideos.textContent = `Videos: ${totalVideos || 0}`;
        elementos.totalRecuerdos.textContent = `Total: ${(totalFotos || 0) + (totalVideos || 0)}`;

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// ========== CONFIGURACIÓN INICIAL EN SUPABASE ==========
/*
PASOS PARA CONFIGURAR EN SUPABASE:

1. Ve a Authentication → Policies
   - Habilita políticas para la tabla 'fotos':
     * INSERT: true para todos (anon)
     * SELECT: true para todos (anon)

2. Ve a Storage → fotos-album → Policies
   - Crea políticas para el bucket:
     * SELECT: true para todos
     * INSERT: true para todos

3. En la tabla 'configuracion', inserta tu portada:
   INSERT INTO configuracion (clave, valor) VALUES
   ('portada_url', 'https://tuservidor.com/tu-portada.jpg'),
   ('titulo_portada', 'Mis XV Años'),
   ('subtitulo_portada', 'Un día inolvidable');
*/

