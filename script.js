// ========== CONFIGURACIÓN SUPABASE ==========
const SUPABASE_URL = 'https://tvqwbvdzjtyzsfegyuzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cXdidmR6anR5enNmZWd5dXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjE5MDMsImV4cCI6MjA4MDQ5NzkwM30.JnE9FJFoeaULaddBWgXigGmvuKY56FjWID0fsAGkmgI';

// ========== CONFIGURACIÓN COMPRESIÓN INTELIGENTE ==========
const COMPRESION_CONFIG = {
    ACTIVADA: true,
    CALIDAD_JPEG: 0.82,           // Excelente calidad (82%)
    CALIDAD_WEBP: 0.80,          // WebP es más eficiente
    ANCHO_MAXIMO: 1920,          // Full HD es más que suficiente
    ALTO_MAXIMO: 1920,
    TAMANIO_OBJETIVO_KB: 400,    // Objetivo: ~400KB por foto
    COMPRIMIR_SI_MAYOR_A_MB: 1,  // Solo comprimir si > 1MB
    MANTENER_EXIF: false,        // Quitar metadatos para ahorrar espacio
    USAR_WEBP_SI_SOPORTA: true   // WebP ahorra 25-30% más que JPEG
};

// ========== DETECTAR SOPORTE WEBP ==========
const soportaWebP = (() => {
    const elem = document.createElement('canvas');
    if (!!(elem.getContext && elem.getContext('2d'))) {
        return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
})();

console.log(`🖼️ Compresión: ${COMPRESION_CONFIG.ACTIVADA ? 'ACTIVA' : 'INACTIVA'}`);
console.log(`📊 Formato preferido: ${soportaWebP ? 'WebP' : 'JPEG'}`);
console.log(`🎯 Calidad: ${COMPRESION_CONFIG.CALIDAD_JPEG * 100}%`);
console.log(`📏 Resolución máxima: ${COMPRESION_CONFIG.ANCHO_MAXIMO}px`);

// ========== INICIALIZACIÓN SUPABASE ==========
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== ESTADO GLOBAL ==========
const estado = {
    paginaActual: 0,
    porPagina: 12,
    tipoFiltro: 'todos',
    archivosParaSubir: [],
    cargando: false,
    todasLasFotos: [],
    espacioUsadoMB: 0,
    archivosSubidos: 0
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
    console.log('📸 Álbum XV años - Modo compresión inteligente');
    
    if (esMovil()) {
        document.body.classList.add('es-movil');
        console.log('📱 Modo móvil: Compresión optimizada');
    }
    
    // Mostrar info de compresión
    if (COMPRESION_CONFIG.ACTIVADA) {
        mostrarInfoCompresion();
    }
    
    inicializarApp().catch(error => {
        console.error('❌ Error:', error);
        mostrarErrorInicial();
    });
});

function mostrarInfoCompresion() {
    const info = document.createElement('div');
    info.className = 'info-compresion';
    info.innerHTML = `
        <i class="fas fa-compress-alt"></i>
        <span>Fotos optimizadas para web (${COMPRESION_CONFIG.CALIDAD_JPEG * 100}% calidad)</span>
    `;
    
    const dropZone = elementos.dropZone;
    if (dropZone.querySelector('.info-tamano')) {
        dropZone.querySelector('.info-tamano').after(info);
    }
}

async function inicializarApp() {
    await cargarConfiguracion();
    await cargarGaleria();
    configurarEventos();
    inicializarVisor();
    await verificarEspacioDisponible();
}

// ========== FUNCIÓN DE COMPRESIÓN INTELIGENTE ==========
async function comprimirImagenInteligente(archivo) {
    // Solo comprimir imágenes y si la compresión está activada
    if (!COMPRESION_CONFIG.ACTIVADA || !archivo.type.startsWith('image/')) {
        return archivo;
    }
    
    // Solo comprimir si es mayor al umbral
    if (archivo.size < COMPRESION_CONFIG.COMPRIMIR_SI_MAYOR_A_MB * 1024 * 1024) {
        console.log(`📊 No necesita compresión: ${(archivo.size/1024).toFixed(0)}KB`);
        return archivo;
    }
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const img = new Image();
                img.src = e.target.result;
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { alpha: false });
                    
                    // Calcular nuevas dimensiones manteniendo aspecto
                    let ancho = img.width;
                    let alto = img.height;
                    
                    // Redimensionar solo si es más grande que el máximo
                    if (ancho > COMPRESION_CONFIG.ANCHO_MAXIMO || alto > COMPRESION_CONFIG.ALTO_MAXIMO) {
                        const ratio = Math.min(
                            COMPRESION_CONFIG.ANCHO_MAXIMO / ancho,
                            COMPRESION_CONFIG.ALTO_MAXIMO / alto
                        );
                        ancho = Math.floor(ancho * ratio);
                        alto = Math.floor(alto * ratio);
                    }
                    
                    // Configurar canvas
                    canvas.width = ancho;
                    canvas.height = alto;
                    
                    // Configurar calidad de renderizado
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // Dibujar imagen redimensionada
                    ctx.drawImage(img, 0, 0, ancho, alto);
                    
                    // Determinar formato y calidad
                    const formato = soportaWebP && COMPRESION_CONFIG.USAR_WEBP_SI_SOPORTA ? 'image/webp' : 'image/jpeg';
                    const calidad = formato === 'image/webp' ? COMPRESION_CONFIG.CALIDAD_WEBP : COMPRESION_CONFIG.CALIDAD_JPEG;
                    
                    // Convertir a Blob
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            console.warn('⚠️ No se pudo comprimir, usando original');
                            resolve(archivo);
                            return;
                        }
                        
                        // Crear nuevo archivo comprimido
                        const nombreOriginal = archivo.name;
                        const extension = formato === 'image/webp' ? 'webp' : 'jpg';
                        const nombreComprimido = nombreOriginal.replace(/\.[^/.]+$/, '') + `_opt.${extension}`;
                        
                        const archivoComprimido = new File([blob], nombreComprimido, {
                            type: formato,
                            lastModified: Date.now()
                        });
                        
                        // Calcular reducción
                        const reduccion = ((archivo.size - blob.size) / archivo.size * 100).toFixed(1);
                        console.log(`✅ Comprimido: ${(archivo.size/1024/1024).toFixed(2)}MB → ${(blob.size/1024/1024).toFixed(2)}MB (${reduccion}% reducción)`);
                        
                        // Si la compresión no fue efectiva (>90% del tamaño original), usar original
                        if (blob.size > archivo.size * 0.9) {
                            console.log('ℹ️ Compresión mínima, usando original');
                            resolve(archivo);
                        } else {
                            resolve(archivoComprimido);
                        }
                        
                    }, formato, calidad);
                };
                
                img.onerror = () => {
                    console.warn('⚠️ Error cargando imagen, usando original');
                    resolve(archivo);
                };
                
            } catch (error) {
                console.error('❌ Error en compresión:', error);
                resolve(archivo); // Fallback al original
            }
        };
        
        reader.onerror = () => {
            console.warn('⚠️ Error leyendo archivo, usando original');
            resolve(archivo);
        };
        
        reader.readAsDataURL(archivo);
    });
}

// ========== FUNCIÓN PARA VIDEOS (compresión ligera) ==========
async function optimizarVideo(archivo) {
    if (!archivo.type.startsWith('video/')) {
        return archivo;
    }
    
    // Para videos, solo limitamos duración si es muy largo
    // Nota: La compresión real de video requiere backend
    console.log(`🎥 Video: ${(archivo.size/1024/1024).toFixed(2)}MB - ${archivo.type}`);
    
    return archivo; // Devolver original (la compresión de video es compleja)
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

    // Selección de archivos
    elementos.dropZone.addEventListener('click', () => elementos.fileInput.click());
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

async function procesarArchivos(archivos) {
    for (const archivo of archivos) {
        const validacion = validarArchivo(archivo);
        
        if (!validacion.valido) {
            alert(`❌ Error: "${archivo.name}"\n${validacion.errores.join('\n')}`);
            continue;
        }

        estado.archivosParaSubir.push(archivo);
    }

    await actualizarPreviewArchivos();
    elementos.fileInput.value = '';
}

function validarArchivo(archivo) {
    const errores = [];
    
    // Validar tipo
    const tiposPermitidos = [...COMPRESION_CONFIG.ALLOWED_TYPES?.images || [], ...COMPRESION_CONFIG.ALLOWED_TYPES?.videos || []];
    if (tiposPermitidos.length > 0 && !tiposPermitidos.includes(archivo.type)) {
        errores.push('Tipo de archivo no permitido. Solo imágenes y videos');
    }
    
    // Validar tamaño (50MB máximo)
    const maxBytes = 50 * 1024 * 1024;
    if (archivo.size > maxBytes) {
        const tamañoMB = (archivo.size / (1024 * 1024)).toFixed(1);
        errores.push(`Muy grande: ${tamañoMB}MB (máximo: 50MB)`);
    }
    
    return {
        valido: errores.length === 0,
        errores: errores
    };
}

async function actualizarPreviewArchivos() {
    elementos.previewArchivos.innerHTML = '';

    if (estado.archivosParaSubir.length === 0) {
        elementos.previewArchivos.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No hay archivos seleccionados</p>';
        elementos.btnSubmit.disabled = true;
        return;
    }

    for (let i = 0; i < estado.archivosParaSubir.length; i++) {
        const archivo = estado.archivosParaSubir[i];
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.title = `${archivo.name} (${(archivo.size/1024/1024).toFixed(2)}MB)`;

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
            estado.archivosParaSubir.splice(i, 1);
            actualizarPreviewArchivos();
        });

        previewItem.appendChild(btnEliminar);
        elementos.previewArchivos.appendChild(previewItem);
    }

    elementos.btnSubmit.disabled = false;
    const totalMB = estado.archivosParaSubir.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024;
    elementos.btnSubmit.innerHTML = `<i class="fas fa-paper-plane"></i> Subir ${estado.archivosParaSubir.length} archivo${estado.archivosParaSubir.length > 1 ? 's' : ''} (${totalMB.toFixed(1)}MB)`;
}

// ========== SUBIDA CON COMPRESIÓN ==========
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
    elementos.progresoTexto.textContent = 'Optimizando...';

    let subidasExitosas = 0;
    const totalArchivos = estado.archivosParaSubir.length;
    let tamañoOriginalTotal = 0;
    let tamañoComprimidoTotal = 0;

    for (let i = 0; i < estado.archivosParaSubir.length; i++) {
        const archivoOriginal = estado.archivosParaSubir[i];
        tamañoOriginalTotal += archivoOriginal.size;

        try {
            let archivoParaSubir = archivoOriginal;
            
            // Optimizar según tipo
            if (archivoOriginal.type.startsWith('image/')) {
                elementos.progresoTexto.textContent = `Optimizando imagen ${i + 1}/${totalArchivos}...`;
                archivoParaSubir = await comprimirImagenInteligente(archivoOriginal);
            } else if (archivoOriginal.type.startsWith('video/')) {
                elementos.progresoTexto.textContent = `Procesando video ${i + 1}/${totalArchivos}...`;
                archivoParaSubir = await optimizarVideo(archivoOriginal);
            }
            
            tamañoComprimidoTotal += archivoParaSubir.size;
            const tipo = archivoParaSubir.type.startsWith('image/') ? 'foto' : 'video';

            // Generar nombre único
            const extension = archivoParaSubir.name.split('.').pop().toLowerCase();
            const nombreArchivo = `xv_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}.${extension}`;
            
            // Subir a Storage
            const { error: uploadError } = await supabase.storage
                .from('fotos-album')
                .upload(nombreArchivo, archivoParaSubir);

            if (uploadError) {
                console.error('Error subiendo:', uploadError);
                throw new Error(`Error de subida: ${uploadError.message}`);
            }

            // Obtener URL pública
            const { data: urlData } = supabase.storage
                .from('fotos-album')
                .getPublicUrl(nombreArchivo);

            // Guardar en base de datos
            const { error: dbError } = await supabase
                .from('fotos')
                .insert({
                    url: urlData.publicUrl,
                    tipo: tipo
                });

            if (dbError) throw dbError;

            subidasExitosas++;
            estado.archivosSubidos++;

            // Actualizar progreso
            const progreso = Math.round((subidasExitosas / totalArchivos) * 100);
            elementos.progresoBar.style.width = `${progreso}%`;
            elementos.progresoTexto.textContent = `Subiendo... ${subidasExitosas}/${totalArchivos}`;

        } catch (error) {
            console.error('❌ Error en subida:', error);
            alert(`Error al subir "${archivoOriginal.name}": ${error.message}`);
        }
    }

    // Calcular ahorro
    const ahorroMB = (tamañoOriginalTotal - tamañoComprimidoTotal) / 1024 / 1024;
    const porcentajeAhorro = ((ahorroMB / (tamañoOriginalTotal / 1024 / 1024)) * 100).toFixed(1);
    
    elementos.progresoTexto.textContent = `✅ ¡Listo! ${subidasExitosas} archivos subidos`;
    
    if (ahorroMB > 0) {
        elementos.progresoTexto.textContent += ` (Ahorrado: ${ahorroMB.toFixed(2)}MB - ${porcentajeAhorro}%)`;
    }
    
    elementos.btnSubmit.disabled = false;
    estado.cargando = false;

    // Actualizar espacio usado
    estado.espacioUsadoMB += tamañoComprimidoTotal / 1024 / 1024;
    actualizarContadorEspacio();

    // Resetear y actualizar
    setTimeout(() => {
        resetearFormulario();
        cerrarModal();
        estado.paginaActual = 0;
        elementos.contenedorGaleria.innerHTML = '';
        cargarGaleria();
        verificarEspacioDisponible();
    }, 2000);
}

function actualizarContadorEspacio() {
    const usadoMB = estado.espacioUsadoMB;
    const porcentaje = (usadoMB / 1024) * 100; // 1024MB = 1GB límite free
    
    console.log(`📊 Espacio usado: ${usadoMB.toFixed(2)}MB (${porcentaje.toFixed(1)}% del límite free)`);
    
    if (porcentaje > 70) {
        console.warn('⚠️ ALERTA: El álbum está llegando al límite de espacio');
        // Podrías mostrar una alerta al usuario
    }
}

function resetearFormulario() {
    estado.archivosParaSubir = [];
    actualizarPreviewArchivos();
    elementos.progresoContenedor.style.display = 'none';
    elementos.btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> Subir Recuerdos';
}

// ========== VERIFICAR ESPACIO DISPONIBLE ==========
async function verificarEspacioDisponible() {
    try {
        console.log('🔍 Verificando espacio en Supabase...');
        
        // Obtener lista de archivos
        const { data: archivos, error } = await supabase.storage
            .from('fotos-album')
            .list();
        
        if (error) throw error;
        
        console.log(`📦 Total archivos en álbum: ${archivos.length}`);
        
        // Actualizar estado
        estado.archivosSubidos = archivos.length;
        
        // Nota: Para obtener tamaño exacto necesitaríamos metadata
        // Esta es una estimación
        const estimadoMB = archivos.length * 0.4; // 400KB promedio por foto comprimida
        estado.espacioUsadoMB = estimadoMB;
        
        actualizarContadorEspacio();
        
        return true;
        
    } catch (error) {
        console.error('Error verificando espacio:', error);
        return false;
    }
}

// ========== GALERÍA Y VISOR (sin cambios) ==========
async function cargarGaleria() {
    try {
        elementos.btnCargarMas.disabled = true;
        elementos.btnCargarMas.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';

        const { data: todasLasFotos, error } = await supabase
            .from('fotos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        estado.todasLasFotos = todasLasFotos;
        
        let contenidoFiltrado = todasLasFotos;
        if (estado.tipoFiltro !== 'todos') {
            contenidoFiltrado = todasLasFotos.filter(item => item.tipo === estado.tipoFiltro);
        }
        
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

        if (estado.paginaActual === 0) {
            elementos.contenedorGaleria.innerHTML = '';
        }

        contenidoPagina.forEach((item, index) => {
            const indiceGlobal = inicio + index;
            const elementoGaleria = crearElementoGaleria(item, indiceGlobal);
            elementos.contenedorGaleria.appendChild(elementoGaleria);
        });

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
    
    elemento.addEventListener('click', () => {
        abrirVisor(index);
    });

    return elemento;
}

// ========== SISTEMA DE VISOR ==========
function inicializarVisor() {
    elementos.visorCerrar.addEventListener('click', cerrarVisor);
    elementos.visor.addEventListener('click', (e) => {
        if (e.target === elementos.visor || e.target.classList.contains('visor-contenido')) {
            cerrarVisor();
        }
    });
    
    elementos.visorAnterior.addEventListener('click', () => navegarVisor(-1));
    elementos.visorSiguiente.addEventListener('click', () => navegarVisor(1));
    
    document.addEventListener('keydown', (e) => {
        if (!elementos.visor.classList.contains('mostrar')) return;
        
        if (e.key === 'Escape' || e.key === ' ') cerrarVisor();
        if (e.key === 'ArrowLeft') navegarVisor(-1);
        if (e.key === 'ArrowRight') navegarVisor(1);
    });
    
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
        navegarVisor(1);
    } else {
        navegarVisor(-1);
    }
}

function abrirVisor(indice) {
    let contenidoFiltrado = estado.todasLasFotos;
    if (estado.tipoFiltro !== 'todos') {
        contenidoFiltrado = estado.todasLasFotos.filter(item => item.tipo === estado.tipoFiltro);
    }
    
    fotosVisor = contenidoFiltrado;
    
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
    
    if (!elementos.visorVideo.paused) {
        elementos.visorVideo.pause();
    }
}

function navegarVisor(direccion) {
    indiceVisor += direccion;
    
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
        elementos.visorVideo.play().catch(e => console.log('Autoplay bloqueado'));
    }
    
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

// ========== INICIALIZAR ==========
function cargarFuentes() {
    if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
}

cargarFuentes();
