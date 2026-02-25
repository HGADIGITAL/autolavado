// Constante para la clave de almacenamiento local
const STORAGE_KEY = 'registrosVehiculos';
const PORCENTAJE_ELIEL = 0.60; // 60%
const PORCENTAJE_EMPLEADOS = 0.40; // 40%

// -------------------------------------------------------------
// Funciones de Acceso a Datos y Hora
// -------------------------------------------------------------

/**
 * Carga los registros del localStorage y asegura que el costo y los insumos sean números.
 * @returns {Array<Object>} Lista de registros.
 */
function getRegistros() {
    const data = localStorage.getItem(STORAGE_KEY);
    let registros = JSON.parse(data || '[]');
    
    return registros.map(reg => ({
        ...reg,
        costo: parseFloat(reg.costo) || 0.00,
        insumos: parseFloat(reg.insumos) || 0.00 
    }));
}

/**
 * Guarda el array de registros en el localStorage, formateando los números.
 * @param {Array<Object>} registros - El array completo de registros a guardar.
 */
function saveRegistros(registros) {
    const registrosToSave = registros.map(reg => ({
        ...reg,
        costo: (parseFloat(reg.costo) || 0.00).toFixed(2),
        insumos: (parseFloat(reg.insumos) || 0.00).toFixed(2) // Guardar insumos
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registrosToSave));
}

/**
 * Genera la hora actual del sistema en un formato legible.
 */
function generarHoraAutomatica() {
    const ahora = new Date();
    return ahora.toLocaleDateString() + ' ' + ahora.toLocaleTimeString();
}

// -------------------------------------------------------------
// ** FUNCIÓN CLAVE DE CÁLCULO DE INGRESOS (CORREGIDA) **
// -------------------------------------------------------------

function calcularTotalIngresos() {
    const registros = getRegistros();
    
    // 1. Calcular el Total Global de Costos de Vehículos (Ingreso Bruto)
    let totalGlobalBruto = registros.reduce((sum, registro) => sum + registro.costo, 0);

    // 2. Calcular la Deducción por Insumos
    let deduccionInsumosTotal = registros.reduce((sum, registro) => sum + registro.insumos, 0);

    // 3. Balance de Caja Esperado (Total Global - Deducción Insumos)
    let balanceCajaEsperado = totalGlobalBruto - deduccionInsumosTotal; 
    
    // 4. Aplicar la distribución:
    let ingresosEmpleados = totalGlobalBruto * PORCENTAJE_EMPLEADOS; // 40% del BRUTO
    let ingresosElielBaseBruto = totalGlobalBruto * PORCENTAJE_ELIEL;
    let ingresosElielFinal = ingresosElielBaseBruto - deduccionInsumosTotal; // 60% del BRUTO - Insumos

    // 5. Mostrar el Balance de Caja Esperado (Destacado)
    const balanceContainer = document.getElementById('balance-caja-container');
    balanceContainer.innerHTML = `
        Balance de Caja Esperado (Neto Real): <span>$${balanceCajaEsperado.toFixed(2)}</span>
    `;

    // 6. Mostrar los resultados en el Contenedor Principal (Distribución)
    const container = document.getElementById('detalle-ingresos-container');
    
    container.innerHTML = `
        <p>💵 Ingresos Totales Globales (Bruto): <span>$${totalGlobalBruto.toFixed(2)}</span></p>
        <hr style="border-top: 1px solid #ddd; margin: 5px 0;">
        <p>👥 Ingresos Empleados (40% del Bruto): <span>$${ingresosEmpleados.toFixed(2)}</span></p>
        <p>👨‍💼 Ingresos Eliel (60% del Bruto): <span>$${ingresosElielFinal.toFixed(2)}</span></p>
        
        <p style="font-size: 0.85em; color: #dc3545; font-weight: normal; margin-top: 5px;">
            Nota: El total de Insumos (-$${deduccionInsumosTotal.toFixed(2)}) solo se descuenta a Eliel y la Caja.
        </p>
    `;
}

// -------------------------------------------------------------
// Funciones de Lógica de Negocio (CRUD)
// -------------------------------------------------------------

/**
 * Elimina un registro del localStorage por su índice.
 */
function borrarRegistro(index) {
    let registros = getRegistros();
    registros.splice(index, 1); 
    saveRegistros(registros);
    actualizarTablaYContador();
}

/**
 * Muestra el modal de edición y carga los datos del registro seleccionado.
 */
function cargarModalEdicion(index) {
    const registros = getRegistros();
    const registro = registros[index];

    document.getElementById('edit-index').value = index;
    document.getElementById('edit-color').value = registro.color;
    document.getElementById('edit-costo').value = registro.costo.toFixed(2); 
    document.getElementById('edit-insumos').value = registro.insumos.toFixed(2); // Cargar insumos

    document.getElementById('modalEdicion').style.display = 'flex'; 
}

/**
 * Oculta el formulario modal de edición.
 */
function ocultarModal() {
    document.getElementById('modalEdicion').style.display = 'none';
}

/**
 * Procesa la actualización del registro desde el formulario modal.
 */
document.getElementById('edicionFormContent').addEventListener('submit', function(event) {
    event.preventDefault(); 
    
    const index = parseInt(document.getElementById('edit-index').value);
    const nuevoColor = document.getElementById('edit-color').value.trim();
    const nuevoCosto = parseFloat(document.getElementById('edit-costo').value);
    const nuevoInsumo = parseFloat(document.getElementById('edit-insumos').value); // Capturar insumos

    let registros = getRegistros();
    
    if (index >= 0 && index < registros.length && !isNaN(nuevoCosto) && !isNaN(nuevoInsumo)) {
        registros[index].color = nuevoColor;
        registros[index].costo = nuevoCosto; 
        registros[index].insumos = nuevoInsumo; // Actualizar insumos
        
        saveRegistros(registros);
        actualizarTablaYContador();
        ocultarModal();
    } else {
        console.error('Error: Datos no válidos para la modificación.');
        ocultarModal(); 
    }
});


/**
 * Actualiza la tabla HTML, el contador, y el detalle de ingresos.
 */
function actualizarTablaYContador() {
    const registros = getRegistros();
    const tbody = document.getElementById('tablaRegistros').getElementsByTagName('tbody')[0];
    const contador = document.getElementById('contador-registros');
    
    // 1. Limpiar la tabla
    tbody.innerHTML = '';

    // 2. Llenar la tabla y crear botones de acción
    registros.forEach((registro, index) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = registro.hora;
        row.insertCell().textContent = registro.tipo;
        row.insertCell().textContent = registro.color;
        row.insertCell().textContent = `$${registro.costo.toFixed(2)}`; 
        row.insertCell().textContent = `$${registro.insumos.toFixed(2)}`; // Mostrar Insumos

        // Columna de Acciones
        const accionesCell = row.insertCell();
        
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
    contador.textContent = `Total de registros: ${registros.length}`;
    calcularTotalIngresos(); 
}

// -------------------------------------------------------------
// Lógica de Registro (al enviar el formulario principal)
// -------------------------------------------------------------

document.getElementById('registroForm').addEventListener('submit', function(event) {
    event.preventDefault(); 

    const tipoCarro = document.getElementById('tipo').value;
    const colorCarro = document.getElementById('color').value.trim();
    const costoInput = parseFloat(document.getElementById('costo').value);
    const insumosInput = parseFloat(document.getElementById('insumos').value); 
    
    const costoCobrado = isNaN(costoInput) ? 0.00 : costoInput; 
    const costoInsumos = isNaN(insumosInput) ? 0.00 : insumosInput; 

    const horaRegistro = generarHoraAutomatica();

    const nuevoRegistro = {
        hora: horaRegistro,
        tipo: tipoCarro,
        color: colorCarro,
        costo: costoCobrado,
        insumos: costoInsumos 
    };

    let registros = getRegistros();
    registros.push(nuevoRegistro);
    saveRegistros(registros); 

    actualizarTablaYContador();
    document.getElementById('registroForm').reset();
});

// -------------------------------------------------------------
// Lógica de Generación de PDF
// -------------------------------------------------------------

function generarReportePDF() {
    const registros = getRegistros();

    if (registros.length === 0) {
        alert('No hay registros guardados para generar el reporte PDF.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // --- Cálculo de los totales para el PDF ---
    let totalGlobalBruto = registros.reduce((sum, registro) => sum + registro.costo, 0);
    let deduccionInsumosTotal = registros.reduce((sum, registro) => sum + registro.insumos, 0);
    
    let balanceCajaEsperado = totalGlobalBruto - deduccionInsumosTotal; 
    let ingresosEmpleados = totalGlobalBruto * PORCENTAJE_EMPLEADOS;
    let ingresosElielBaseBruto = totalGlobalBruto * PORCENTAJE_ELIEL;
    let ingresosElielFinal = ingresosElielBaseBruto - deduccionInsumosTotal;

    const fechaReporte = generarHoraAutomatica();

    // Título y fecha
    doc.setFontSize(16);
    doc.text("Reporte de Registro de Vehículos", 10, 10);
    doc.setFontSize(10);
    doc.text(`Generado el: ${fechaReporte}`, 10, 16);
    
    // Distribución de Ingresos en el PDF
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL GLOBAL DE INGRESOS (Bruto): $${totalGlobalBruto.toFixed(2)}`, 10, 25);
    
    doc.text(`BALANCE DE CAJA ESPERADO (Neto): $${balanceCajaEsperado.toFixed(2)}`, 10, 30);
    doc.text(`INGRESOS EMPLEADOS (40% del Bruto): $${ingresosEmpleados.toFixed(2)}`, 10, 35);
    doc.text(`INGRESOS ELIEL (60% del Bruto - Insumos): $${ingresosElielFinal.toFixed(2)}`, 10, 40);
    
    doc.setFont("helvetica", "normal");
    doc.text(`(Deducción total por Insumos: $${deduccionInsumosTotal.toFixed(2)})`, 10, 45);

    // --- Dibujo de la tabla ---
    let y = 55; 
    const xPositions = [10, 55, 95, 130, 170]; 
    
    // Dibujar encabezados de la tabla de registros
    doc.setFontSize(10);
    doc.text("Hora de Llegada", xPositions[0], y);
    doc.text("Tipo", xPositions[1], y);
    doc.text("Color", xPositions[2], y);
    doc.text("Costo", xPositions[3], y);
    doc.text("Insumos", xPositions[4], y); 
    y += 5;
    
    // Dibujar datos
    doc.setFont("helvetica", "normal");
    registros.forEach(reg => {
        y += 7;
        // Lógica de salto de página
        if (y > 280) {
            doc.addPage();
            y = 15;
            doc.setFont("helvetica", "bold"); 
            doc.text("Hora de Llegada", xPositions[0], y);
            doc.text("Tipo", xPositions[1], y);
            doc.text("Color", xPositions[2], y);
            doc.text("Costo", xPositions[3], y);
            doc.text("Insumos", xPositions[4], y);
            doc.setFont("helvetica", "normal");
            y += 7;
        }

        doc.text(reg.hora, xPositions[0], y);
        doc.text(reg.tipo, xPositions[1], y);
        doc.text(reg.color, xPositions[2], y);
        doc.text(`$${reg.costo.toFixed(2)}`, xPositions[3], y);
        doc.text(`$${reg.insumos.toFixed(2)}`, xPositions[4], y);
    });

    // Guardar el archivo PDF (Inicia la descarga)
    const filename = `Reporte_Caja_${balanceCajaEsperado.toFixed(2)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
}

// -------------------------------------------------------------
// Ejecutar al cargar la página
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    actualizarTablaYContador();
});

// Exportar funciones para que sean accesibles desde el HTML
window.generarReportePDF = generarReportePDF; 
window.ocultarModal = ocultarModal; 
window.cargarModalEdicion = cargarModalEdicion; 
window.borrarRegistro = borrarRegistro;