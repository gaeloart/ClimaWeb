// Variable global para controlar la instancia de la gráfica (Control de Memoria)
let myChartInstance = null;

// Elementos del DOM
const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');
const loadingArea = document.getElementById('loadingArea');
const chartContainer = document.getElementById('chartContainer');
const errorMsg = document.getElementById('errorMessage');

// Evento principal
searchBtn.addEventListener('click', async () => {
    const cityName = cityInput.value.trim();

    // Validación básica
    if (cityName.length < 3) {
        mostrarError("Introduce un nombre de ciudad válido (mínimo 3 letras).");
        return;
    }

    try {
        gestionarEstados('cargando');

        // 1. GEOCODING: Buscamos latitud y longitud por nombre
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${cityName}&count=1&language=es&format=json`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("No se encontró la ciudad. Revisa la ortografía.");
        }

        const { latitude, longitude, name } = geoData.results[0];

        // 2. FETCH CLIMA: Petición asíncrona a Open-Meteo
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max&timezone=auto`);
        const weatherData = await weatherRes.json();

        // 3. TRANSFORMACIÓN DE DATOS: Extraemos solo lo necesario
        const etiquetasX = weatherData.daily.time; // Fechas
        const valoresY = weatherData.daily.temperature_2m_max; // Temperaturas

        // 4. ÉXITO: Renderizar gráfica
        gestionarEstados('exito');
        renderizarGrafica(etiquetasX, valoresY, name);

    } catch (error) {
        mostrarError(error.message);
    }
});

function renderizarGrafica(labels, data, cityName) {
    const ctx = document.getElementById('myChart').getContext('2d');

    // CONTROL DE MEMORIA: Destruir gráfica anterior si existe
    if (myChartInstance) {
        myChartInstance.destroy();
    }

    // INDICADORES VISUALES: Lógica de colores (Rojo > 30, Azul < 10) - Mantengo los puntos dinámicos para visibilidad
    const coloresPuntos = data.map(temp => {
        if (temp > 30) return 'red';
        if (temp < 10) return 'blue';
        return '#007bff'; // Azul estándar para temperaturas medias
    });

    // Crear nueva instancia
    myChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Temperatura Máxima en ${cityName} (°C)`,
                data: data,
                borderColor: 'white', // Línea blanca que conecta los puntos
                pointBackgroundColor: coloresPuntos, // Mantengo colores dinámicos en puntos para indicadores
                pointBorderColor: 'white', // Bordes blancos en puntos para mayor visibilidad
                pointRadius: 6,
                borderWidth: 2,
                fill: false,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Vital para que no crezca infinitamente
            plugins: {
                tooltip: {
                    enabled: true, // Interactividad
                    backgroundColor: 'rgba(0, 0, 0, 0.9)', // Fondo negro para visibilidad en estilo brutalista
                    titleColor: 'white', // Título en blanco
                    bodyColor: 'white', // Cuerpo en blanco
                    borderColor: 'white', // Borde blanco
                    borderWidth: 1,
                    cornerRadius: 0, // Esquinas cuadradas para brutalismo
                    callbacks: {
                        // Personalizar para mostrar "Temperatura máxima" cuando sea el valor máximo
                        label: function(context) {
                            const value = context.parsed.y;
                            const maxValue = Math.max(...context.dataset.data); // Calcula el máximo en el dataset
                            if (value === maxValue) {
                                return `Temperatura máxima: ${value}°C`; // Mensaje especial en blanco para el máximo
                            }
                            return `Temperatura: ${value}°C`; // Para otros puntos
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'white' // Etiquetas del eje X en blanco para visibilidad en fondo negro
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)' // Líneas de cuadrícula sutiles
                    }
                },
                y: {
                    ticks: {
                        color: 'white' // Etiquetas del eje Y en blanco
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)' // Líneas de cuadrícula sutiles
                    }
                }
            }
        }
    });
}

// Funciones de utilidad para manejar la interfaz
function gestionarEstados(estado) {
    errorMsg.style.display = 'none';
    if (estado === 'cargando') {
        loadingArea.style.display = 'block';
        chartContainer.style.display = 'none';
    } else if (estado === 'exito') {
        loadingArea.style.display = 'none';
        chartContainer.style.display = 'block';
    }
}

function mostrarError(mensaje) {
    loadingArea.style.display = 'none';
    chartContainer.style.display = 'none';
    errorMsg.innerText = mensaje;
    errorMsg.style.display = 'block';
}