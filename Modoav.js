// Constante para la clave de almacenamiento local
const STORAGE_KEY = 'registrosVehiculosAvanzado';
const STORAGE_KEY_EMPLEADOS = 'numEmpleadosActual';
const PORCENTAJE_ELIEL = 0.60; // 60%
const PORCENTAJE_EMPLEADOS = 0.40; // 40%

let registrosFiltrados = null; // Para almacenar registros filtrados

// -------------------------------------------------------------
// Funciones de Acceso a Datos y Hora
// -------------------------------------------------------------

/**
 * Carga los registros del localStorage
 */
function getRegistros() {
    const data = localStorage.getItem(STORAGE_KEY);
    let registros = JSON.parse(data || '[]');
    
    return registros.map(reg => ({
        ...reg,
        costo: parseFloat(reg.costo) || 0.00,
        insumos: parseFloat(reg.insumos) || 0.00,
        numEmpleados: parseInt(reg.numEmpleados) || 1
    }));
}

/**
 * Guarda el array de registros en el localStorage
 */
function saveRegistros(registros) {
    const registrosToSave = registros.map(reg => ({
        ...reg,
        costo: (parseFloat(reg.costo) || 0.00).toFixed(2),
        insumos: (parseFloat(reg.insumos) || 0.00).toFixed(2),
        numEmpleados: parseInt(reg.numEmpleados) || 1
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registrosToSave));
}

/**
 * Guarda el número de empleados actual en localStorage
 */
function guardarNumEmpleados(num) {
    localStorage.setItem(STORAGE_KEY_EMPLEADOS, num);
}

/**
 * Carga el número de empleados guardado (por defecto 1)
 */
function cargarNumEmpleados() {
    const num = localStorage.getItem(STORAGE_KEY_EMPLEADOS);
    return num ? parseInt(num) : 1;
}

/**
 * Genera la hora actual del sistema en formato ISO para filtros
 */
function generarHoraAutomatica() {
    const ahora = new Date();
    return {
        timestamp: ahora.getTime(),
        fecha: ahora.toLocaleDateString('es-MX'),
        hora: ahora.toLocaleTimeString('es-MX'),
        fechaCompleta: ahora.toLocaleDateString('es-MX') + ' ' + ahora.toLocaleTimeString('es-MX')
    };
}

/**
 * Convierte una fecha string a timestamp
 */
function fechaStringATimestamp(fechaString) {
    const partes = fechaString.split('/');
    if (partes.length === 3) {
        // Formato DD/MM/YYYY
        const fecha = new Date(partes[2], partes[1] - 1, partes[0]);
        return fecha.getTime();
    }
    return 0;
}

// -------------------------------------------------------------
// Funciones de Manejo de Imágenes con Cámara
// -------------------------------------------------------------

let streamActual = null;

/**
 * Abre la cámara y muestra el video en vivo
 */
async function abrirCamara() {
    const previewContainer = document.getElementById('preview-container');
    
    try {
        // Solicitar acceso a la cámara trasera
        streamActual = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' },
            audio: false 
        });
        
        // Crear elemento video
        previewContainer.innerHTML = `
            <div class="camara-container">
                <video id="video-camara" autoplay playsinline></video>
                <div class="controles-camara">
                    <button type="button" onclick="capturarFoto()" class="btn-capturar">📸 Capturar</button>
                    <button type="button" onclick="cerrarCamara()" class="btn-cancelar-cam">❌ Cancelar</button>
                </div>
            </div>
        `;
        
        const video = document.getElementById('video-camara');
        video.srcObject = streamActual;
        
    } catch (error) {
        alert('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
        console.error('Error al acceder a la cámara:', error);
    }
}

/**
 * Captura la foto del video
 */
function capturarFoto() {
    const video = document.getElementById('video-camara');
    const canvas = document.createElement('canvas');
    const previewContainer = document.getElementById('preview-container');
    
    // Configurar el canvas con el tamaño del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Dibujar el frame actual del video en el canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Convertir a Base64
    const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
    
    // Guardar en el input hidden
    document.getElementById('fotoVehiculo').value = fotoBase64;
    
    // Cerrar la cámara
    cerrarCamara();
    
    // Mostrar preview de la foto capturada
    previewContainer.innerHTML = `
        <div class="foto-capturada">
            <img src="${fotoBase64}" alt="Foto capturada">
            <button type="button" onclick="eliminarFoto()" class="btn-eliminar-foto">🗑️ Eliminar Foto</button>
        </div>
    `;
}

/**
 * Cierra la cámara y libera recursos
 */
function cerrarCamara() {
    if (streamActual) {
        streamActual.getTracks().forEach(track => track.stop());
        streamActual = null;
    }
    
    // Si no hay foto capturada, limpiar el container
    if (!document.getElementById('fotoVehiculo').value) {
        document.getElementById('preview-container').innerHTML = '';
    }
}

/**
 * Elimina la foto capturada
 */
function eliminarFoto() {
    document.getElementById('fotoVehiculo').value = '';
    document.getElementById('preview-container').innerHTML = '';
}

/**
 * Convierte una imagen a Base64
 */
function convertirImagenABase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
}

/**
 * Guardar el número de empleados cuando cambie
 */
document.getElementById('numEmpleados').addEventListener('change', function(e) {
    const num = parseInt(e.target.value);
    if (!isNaN(num) && num > 0) {
        guardarNumEmpleados(num);
    }
});

// -------------------------------------------------------------
// FUNCIÓN CLAVE DE CÁLCULO DE INGRESOS (CON EMPLEADOS)
// -------------------------------------------------------------

function calcularTotalIngresos() {
    const registros = registrosFiltrados || getRegistros();
    
    // 1. Calcular el Total Global de Costos (Ingreso Bruto)
    let totalGlobalBruto = registros.reduce((sum, registro) => sum + registro.costo, 0);

    // 2. Calcular la Deducción por Insumos
    let deduccionInsumosTotal = registros.reduce((sum, registro) => sum + registro.insumos, 0);

    // 3. Balance de Caja Esperado
    let balanceCajaEsperado = totalGlobalBruto - deduccionInsumosTotal;
    
    // 4. Aplicar la distribución
    let ingresosEmpleadosTotal = totalGlobalBruto * PORCENTAJE_EMPLEADOS;
    let ingresosElielBaseBruto = totalGlobalBruto * PORCENTAJE_ELIEL;
    let ingresosElielFinal = ingresosElielBaseBruto - deduccionInsumosTotal;

    // 5. Obtener el número de empleados actual (el que está configurado)
    const numEmpleadosActual = cargarNumEmpleados();
    const ingresoPorEmpleado = ingresosEmpleadosTotal / numEmpleadosActual;

    // 6. Mostrar el Balance de Caja Esperado
    const balanceContainer = document.getElementById('balance-caja-container');
    balanceContainer.innerHTML = `
        Balance de Caja Esperado (Neto Real): <span>$${balanceCajaEsperado.toFixed(2)}</span>
    `;

    // 7. Mostrar los resultados en el Contenedor Principal
    const container = document.getElementById('detalle-ingresos-container');
    
    container.innerHTML = `
        <p>💵 Ingresos Totales Globales (Bruto): <span>$${totalGlobalBruto.toFixed(2)}</span></p>
        <hr style="border-top: 1px solid #ddd; margin: 5px 0;">
        <p>👥 Ingresos Empleados Total (40% del Bruto): <span>$${ingresosEmpleadosTotal.toFixed(2)}</span></p>
        <p>👨‍💼 Ingresos Eliel (60% del Bruto - Insumos): <span>$${ingresosElielFinal.toFixed(2)}</span></p>
        
        <p style="font-size: 0.85em; color: #dc3545; font-weight: normal; margin-top: 5px;">
            Nota: El total de Insumos (-$${deduccionInsumosTotal.toFixed(2)}) solo se descuenta a Eliel y la Caja.
        </p>
    `;

    // 8. Mostrar distribución detallada de empleados
    const empleadosContainer = document.getElementById('detalle-empleados-container');
    
    empleadosContainer.innerHTML = `
        <p style="font-size: 1.2em; margin-bottom: 10px;">👷 Distribución de Empleados:</p>
        <hr style="border-top: 1px solid #ddd; margin: 5px 0;">
        <p>👥 Total de Empleados trabajando: <span>${numEmpleadosActual}</span></p>
        <p>💰 Ingreso por empleado: <span>$${ingresoPorEmpleado.toFixed(2)}</span></p>
        <p style="font-size: 0.9em; color: #666; margin-top: 5px;">
            (Total empleados: $${ingresosEmpleadosTotal.toFixed(2)} ÷ ${numEmpleadosActual} empleados)
        </p>
    `;
}

// -------------------------------------------------------------
// Funciones de Lógica de Negocio (CRUD)
// -------------------------------------------------------------

/**
 * Elimina un registro del localStorage
 */
function borrarRegistro(index) {
    let registros = getRegistros();
    registros.splice(index, 1);
    saveRegistros(registros);
    actualizarVista();
}

/**
 * Actualiza vista sin modificar el número de empleados
 */
function actualizarVista() {
    registrosFiltrados = null;
    actualizarTablaYContador();
}

/**
 * Muestra el modal de edición
 */
function cargarModalEdicion(index) {
    const registros = registrosFiltrados || getRegistros();
    const registro = registros[index];

    document.getElementById('edit-index').value = index;
    document.getElementById('edit-color').value = registro.color;
    document.getElementById('edit-telefono').value = registro.telefono || '';
    document.getElementById('edit-numEmpleados').value = registro.numEmpleados || 1;
    document.getElementById('edit-costo').value = registro.costo.toFixed(2);
    document.getElementById('edit-insumos').value = registro.insumos.toFixed(2);

    document.getElementById('modalEdicion').style.display = 'flex';
}

/**
 * Oculta el modal de edición
 */
function ocultarModal() {
    document.getElementById('modalEdicion').style.display = 'none';
}

/**
 * Muestra foto ampliada en modal
 */
function verFoto(fotoBase64) {
    document.getElementById('imagenAmpliada').src = fotoBase64;
    document.getElementById('modalFoto').style.display = 'flex';
}

/**
 * Cierra modal de foto
 */
function cerrarModalFoto() {
    document.getElementById('modalFoto').style.display = 'none';
}

/**
 * Procesa la actualización del registro
 */
document.getElementById('edicionFormContent').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const index = parseInt(document.getElementById('edit-index').value);
    const nuevoColor = document.getElementById('edit-color').value.trim();
    const nuevoTelefono = document.getElementById('edit-telefono').value.trim();
    const nuevoNumEmpleados = parseInt(document.getElementById('edit-numEmpleados').value);
    const nuevoCosto = parseFloat(document.getElementById('edit-costo').value);
    const nuevoInsumo = parseFloat(document.getElementById('edit-insumos').value);

    let registros = getRegistros();
    
    if (index >= 0 && index < registros.length && !isNaN(nuevoCosto) && !isNaN(nuevoInsumo) && !isNaN(nuevoNumEmpleados)) {
        registros[index].color = nuevoColor;
        registros[index].telefono = nuevoTelefono;
        registros[index].numEmpleados = nuevoNumEmpleados;
        registros[index].costo = nuevoCosto;
        registros[index].insumos = nuevoInsumo;
        
        saveRegistros(registros);
        actualizarVista();
        ocultarModal();
    } else {
        alert('Error: Datos no válidos para la modificación.');
        ocultarModal();
    }
});

/**
 * Actualiza la tabla HTML, contador y totales
 */
function actualizarTablaYContador() {
    const registros = registrosFiltrados || getRegistros();
    const tbody = document.getElementById('tablaRegistros').getElementsByTagName('tbody')[0];
    const contador = document.getElementById('contador-registros');
    
    // 1. Limpiar la tabla
    tbody.innerHTML = '';

    // 2. Llenar la tabla
    registros.forEach((registro, index) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = registro.fechaCompleta;
        row.insertCell().textContent = registro.tipo;
        row.insertCell().textContent = registro.color;
        row.insertCell().textContent = registro.telefono || 'N/A';
        row.insertCell().textContent = registro.numEmpleados || 1;
        row.insertCell().textContent = `$${registro.costo.toFixed(2)}`;
        row.insertCell().textContent = `$${registro.insumos.toFixed(2)}`;

        // Columna de foto
        const fotoCell = row.insertCell();
        if (registro.foto) {
            const imgMini = document.createElement('img');
            imgMini.src = registro.foto;
            imgMini.className = 'foto-mini';
            imgMini.onclick = () => verFoto(registro.foto);
            fotoCell.appendChild(imgMini);
        } else {
            fotoCell.textContent = 'Sin foto';
        }

        // Columna de acciones
        const accionesCell = row.insertCell();
        
        if (registro.foto) {
            const btnVerFoto = document.createElement('button');
            btnVerFoto.textContent = '👁️';
            btnVerFoto.className = 'btn-ver-foto';
            btnVerFoto.onclick = () => verFoto(registro.foto);
            accionesCell.appendChild(btnVerFoto);
        }
        
        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.className = 'btn-editar';
        btnEditar.onclick = () => cargarModalEdicion(index);
        accionesCell.appendChild(btnEditar);
        
        const btnBorrar = document.createElement('button');
        btnBorrar.textContent = 'Borrar';
        btnBorrar.className = 'btn-borrar';
        btnBorrar.onclick = () => borrarRegistro(index);
        accionesCell.appendChild(btnBorrar);
    });

    // 3. Actualizar contador y totales
    const textoFiltro = registrosFiltrados ? ' (filtrados)' : '';
    contador.textContent = `Total de registros${textoFiltro}: ${registros.length}`;
    calcularTotalIngresos();
}

// -------------------------------------------------------------
// Lógica de Registro (al enviar el formulario principal)
// -------------------------------------------------------------

document.getElementById('registroForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const tipoCarro = document.getElementById('tipo').value;
    const colorCarro = document.getElementById('color').value.trim();
    const telefonoCliente = document.getElementById('telefono').value.trim();
    const numEmpleados = parseInt(document.getElementById('numEmpleados').value);
    const costoInput = parseFloat(document.getElementById('costo').value);
    const insumosInput = parseFloat(document.getElementById('insumos').value);
    
    const costoCobrado = isNaN(costoInput) ? 0.00 : costoInput;
    const costoInsumos = isNaN(insumosInput) ? 0.00 : insumosInput;

    const horaRegistro = generarHoraAutomatica();

    // Obtener foto si existe (del input hidden)
    const fotoBase64 = document.getElementById('fotoVehiculo').value || null;

    const nuevoRegistro = {
        timestamp: horaRegistro.timestamp,
        fecha: horaRegistro.fecha,
        hora: horaRegistro.hora,
        fechaCompleta: horaRegistro.fechaCompleta,
        tipo: tipoCarro,
        color: colorCarro,
        telefono: telefonoCliente,
        numEmpleados: numEmpleados,
        costo: costoCobrado,
        insumos: costoInsumos,
        foto: fotoBase64
    };

    let registros = getRegistros();
    registros.push(nuevoRegistro);
    saveRegistros(registros);

    actualizarVista();
    document.getElementById('registroForm').reset();
    document.getElementById('preview-container').innerHTML = '';
    document.getElementById('fotoVehiculo').value = '';
    
    // Restaurar el número de empleados guardado después del reset
    document.getElementById('numEmpleados').value = cargarNumEmpleados();
});

// -------------------------------------------------------------
// Lógica de Generación de PDF
// -------------------------------------------------------------

function generarReportePDF() {
    const registros = registrosFiltrados || getRegistros();

    if (registros.length === 0) {
        alert('No hay registros para generar el reporte PDF.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Cálculos para el PDF
    let totalGlobalBruto = registros.reduce((sum, registro) => sum + registro.costo, 0);
    let deduccionInsumosTotal = registros.reduce((sum, registro) => sum + registro.insumos, 0);
    
    let balanceCajaEsperado = totalGlobalBruto - deduccionInsumosTotal;
    let ingresosEmpleados = totalGlobalBruto * PORCENTAJE_EMPLEADOS;
    let ingresosElielBaseBruto = totalGlobalBruto * PORCENTAJE_ELIEL;
    let ingresosElielFinal = ingresosElielBaseBruto - deduccionInsumosTotal;

    const fechaReporte = generarHoraAutomatica().fechaCompleta;
    const textoFiltro = registrosFiltrados ? ' (FILTRADO)' : '';

    // Título y fecha
    doc.setFontSize(16);
    doc.text(`Reporte Avanzado${textoFiltro}`, 10, 10);
    doc.setFontSize(10);
    doc.text(`Generado el: ${fechaReporte}`, 10, 16);
    
    // Distribución de Ingresos
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL GLOBAL (Bruto): $${totalGlobalBruto.toFixed(2)}`, 10, 25);
    doc.text(`BALANCE DE CAJA (Neto): $${balanceCajaEsperado.toFixed(2)}`, 10, 30);
    doc.text(`INGRESOS EMPLEADOS (40%): $${ingresosEmpleados.toFixed(2)}`, 10, 35);
    doc.text(`INGRESOS ELIEL (60% - Insumos): $${ingresosElielFinal.toFixed(2)}`, 10, 40);
    
    doc.setFont("helvetica", "normal");
    doc.text(`(Deduccion Insumos: $${deduccionInsumosTotal.toFixed(2)})`, 10, 45);

    // Tabla de registros
    let y = 55;
    const xPositions = [10, 45, 70, 95, 120, 145, 170];
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Fecha", xPositions[0], y);
    doc.text("Tipo", xPositions[1], y);
    doc.text("Color", xPositions[2], y);
    doc.text("Tel", xPositions[3], y);
    doc.text("Emp", xPositions[4], y);
    doc.text("Costo", xPositions[5], y);
    doc.text("Ins", xPositions[6], y);
    y += 5;
    
    doc.setFont("helvetica", "normal");
    registros.forEach(reg => {
        y += 6;
        if (y > 280) {
            doc.addPage();
            y = 15;
        }

        doc.text(reg.fecha, xPositions[0], y);
        doc.text(reg.tipo.substring(0, 8), xPositions[1], y);
        doc.text(reg.color.substring(0, 10), xPositions[2], y);
        doc.text(reg.telefono ? reg.telefono.substring(0, 10) : 'N/A', xPositions[3], y);
        doc.text(String(reg.numEmpleados || 1), xPositions[4], y);
        doc.text(`$${reg.costo.toFixed(2)}`, xPositions[5], y);
        doc.text(`$${reg.insumos.toFixed(2)}`, xPositions[6], y);
    });

    const filename = `Reporte_Avanzado_${balanceCajaEsperado.toFixed(2)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
}

// -------------------------------------------------------------
// Ejecutar al cargar la página
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    actualizarTablaYContador();
    // Cargar el número de empleados guardado
    document.getElementById('numEmpleados').value = cargarNumEmpleados();
});

// Exportar funciones globales
window.generarReportePDF = generarReportePDF;
window.ocultarModal = ocultarModal;
window.cargarModalEdicion = cargarModalEdicion;
window.borrarRegistro = borrarRegistro;
window.verFoto = verFoto;
window.cerrarModalFoto = cerrarModalFoto;
window.abrirCamara = abrirCamara;
window.capturarFoto = capturarFoto;
window.cerrarCamara = cerrarCamara;
window.eliminarFoto = eliminarFoto;