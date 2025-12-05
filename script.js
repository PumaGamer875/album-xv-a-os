// Configurar Supabase
const supabaseUrl = 'https://TU_PROYECTO.supabase.co';
const supabaseKey = 'TU_API_KEY_PUBLICA';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Variables globales
let paginaActual = 0;
const fotosPorPagina = 9;
let categoriaActual = 'todas';

// Elementos DOM
const galeria = document.getElementById('galeria');
const btnCargarMas = document.getElementById('btnCargarMas');
const filtrosBtn = document.querySelectorAll('.filtro-btn');

// Cargar fotos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    cargarFotos();
    configurarFiltros();
});

// Función para cargar fotos
async function cargarFotos() {
    try {
        let query = supabase
            .from('fotos')
            .select('*')
            .range(paginaActual * fotosPorPagina, (paginaActual * fotosPorPagina) + fotosPorPagina - 1)
            .order('created_at', { ascending: false });

        // Filtrar por categoría si no es "todas"
        if (categoriaActual !== 'todas') {
            query = query.eq('categoria', categoriaActual);
        }

        const { data: fotos, error } = await query;

        if (error) throw error;

        if (fotos.length === 0 && paginaActual === 0) {
            galeria.innerHTML = '<p class="no-fotos">No hay fotos aún. ¡Sube las primeras desde Supabase!</p>';
            return;
        }

        // Mostrar fotos
        fotos.forEach(foto => {
            const fotoElement = document.createElement('div');
            fotoElement.className = 'foto-item';
            fotoElement.innerHTML = `
                <img src="${foto.url}" alt="${foto.titulo}" loading="lazy">
                <div class="foto-info">
                    <h3>${foto.titulo || 'Sin título'}</h3>
                    <p>${foto.descripcion || ''}</p>
                </div>
            `;
            galeria.appendChild(fotoElement);
        });

        // Mostrar/ocultar botón "Cargar más"
        btnCargarMas.style.display = fotos.length === fotosPorPagina ? 'block' : 'none';

    } catch (error) {
        console.error('Error cargando fotos:', error);
        galeria.innerHTML = '<p class="error">Error al cargar las fotos. Revisa la consola.</p>';
    }
}

// Configurar filtros
function configurarFiltros() {
    filtrosBtn.forEach(btn => {
        btn.addEventListener('click', () => {
            // Quitar clase active a todos
            filtrosBtn.forEach(b => b.classList.remove('active'));
            // Añadir al botón clickeado
            btn.classList.add('active');
            
            // Cambiar categoría y recargar
            categoriaActual = btn.dataset.categoria;
            paginaActual = 0;
            galeria.innerHTML = '';
            cargarFotos();
        });
    });
}

// Cargar más fotos
btnCargarMas.addEventListener('click', () => {
    paginaActual++;
    cargarFotos();
});