// Configuration
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCDyxbZENgCDBXSoAKvesvsE7DThug-c18UWYtVk-rS1EvezbpT16diX39XP0WPJYUDg/exec";

// State Management
let patients = [];
const modal = new bootstrap.Modal(document.getElementById('patientModal'));
const viewModal = new bootstrap.Modal(document.getElementById('viewModal'));
const reportModal = new bootstrap.Modal(document.getElementById('reportModal'));
const statsModal = new bootstrap.Modal(document.getElementById('statsModal'));
const patientForm = document.getElementById('patientForm');
const patientsBody = document.getElementById('patientsBody');
const noResults = document.getElementById('noResults');
const searchInput = document.getElementById('searchInput');
const searchInputMobile = document.getElementById('searchInputMobile');

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    fetchPatients();
    initMasks();

    // Set default date to today
    document.getElementById('fechaIns').valueAsDate = new Date();
    document.getElementById('reportMonth').value = new Date().toISOString().substring(0, 7);
});

// API Operations
async function fetchPatients() {
    try {
        patientsBody.innerHTML = `<tr><td colspan="8" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">Sincronizando con Google Sheets...</p></td></tr>`;

        const response = await fetch(`${SCRIPT_URL}?action=listar`);
        const data = await response.json();

        // Skip headers (row 0) and map rows to objects
        const rows = data.slice(1);
        patients = rows.map(row => ({
            id: row[0],
            correlativo: row[0],
            expediente: row[1],
            apellidos: row[2],
            nombres: row[3],
            dui: row[4],
            fechaIns: formatGSDate(row[5]),
            responsable: row[6],
            cel: row[7]
        }));

        renderPatients();
    } catch (error) {
        console.error('Error fetching patients:', error);
        showToast('Error al conectar con la base de datos', 'error');
        patientsBody.innerHTML = '';
        noResults.classList.remove('d-none');
    }
}

// Rendering Logic
function renderPatients(filteredData = null) {
    const data = filteredData || patients;
    patientsBody.innerHTML = '';

    if (data.length === 0) {
        noResults.classList.remove('d-none');
        return;
    }

    noResults.classList.add('d-none');

    data.forEach((p, index) => {
        const tr = document.createElement('tr');
        tr.className = 'fade-in';
        tr.style.animationDelay = `${index * 0.05}s`;

        tr.innerHTML = `
            <td><span class="badge-id">${p.correlativo}</span></td>
            <td><span class="fw-semibold text-accent">${p.expediente}</span></td>
            <td>
                <div class="d-flex flex-column">
                    <span class="fw-bold"<>${p.nombres}</span>
                    <span class="fw-bold">${p.apellidos}</span>
                </div>
            </td>
            <td>${p.dui}</td>
            <td>${formatDisplayDate(p.fechaIns)}</td>
            <td>${p.responsable || '<em class="text-muted">N/A</em>'}</td>
            <td>
                <a href="tel:${p.cel}" class="text-decoration-none text-primary fw-medium">
                    <i class="fas fa-phone-alt me-1 small"></i>${p.cel}
                </a>
            </td>
            <td class="text-center">
                <div class="d-flex justify-content-center">
                    <button class="btn-action btn-edit bg-info-subtle text-info" onclick="viewPatient('${p.id}')" title="Ver Detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editPatient('${p.id}')" title="Editar">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deletePatient('${p.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        patientsBody.appendChild(tr);
    });
}

// CRUD Operations
patientForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Guardando...`;

    const editId = document.getElementById('editIndex').value;

    const formData = {
        tipo: editId ? "EDITAR" : "CREAR",
        correlativo: document.getElementById('correlativo').value,
        expediente: document.getElementById('expediente').value,
        nombres: document.getElementById('nombres').value,
        apellidos: document.getElementById('apellidos').value,
        dui: document.getElementById('dui').value,
        fecha_ins: document.getElementById('fechaIns').value,
        responsable: document.getElementById('responsable').value,
        celular: document.getElementById('cel').value
    };

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        showToast(editId ? 'Datos actualizados con éxito' : 'Paciente registrado con éxito', 'success');

        modal.hide();
        patientForm.reset();

        // Refresh with delay
        setTimeout(fetchPatients, 1500);

    } catch (error) {
        console.error('Error saving patient:', error);
        showToast('Error al procesar la solicitud', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
});

function viewPatient(id) {
    const p = patients.find(p => p.id == id);
    if (!p) return;

    const body = document.getElementById('viewModalBody');
    body.innerHTML = `
        <div class="text-center mb-4">
            <div class="display-6 text-primary mb-2"><i class="fas fa-user-circle"></i></div>
            <h4 class="fw-bold mb-0">${p.nombres} ${p.apellidos}</h4>
            <span class="badge bg-primary-subtle text-primary mt-2">ID: ${p.correlativo}</span>
        </div>
        <ul class="list-group list-group-flush border-top">
            <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                <span class="text-muted"><i class="fas fa-folder-open me-2"></i>Expediente</span>
                <span class="fw-bold">${p.expediente}</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                <span class="text-muted"><i class="fas fa-id-card me-2"></i>DUI</span>
                <span class="fw-bold">${p.dui}</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                <span class="text-muted"><i class="fas fa-calendar-check me-2"></i>Inscripción</span>
                <span class="fw-bold">${formatDisplayDate(p.fechaIns)}</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                <span class="text-muted"><i class="fas fa-user-tie me-2"></i>Responsable</span>
                <span class="fw-bold text-end">${p.responsable || 'N/A'}</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                <span class="text-muted"><i class="fas fa-phone me-2"></i>Celular</span>
                <span class="fw-bold text-primary">${p.cel}</span>
            </li>
        </ul>
    `;
    viewModal.show();
}

function editPatient(id) {
    const patient = patients.find(p => p.id == id);
    if (!patient) return;

    document.getElementById('modalTitleText').innerText = 'Editar Registro';
    document.getElementById('saveBtn').innerText = 'Actualizar';

    document.getElementById('editIndex').value = patient.id;
    document.getElementById('correlativo').value = patient.correlativo;
    // Correlativo is always read-only now

    document.getElementById('expediente').value = patient.expediente;
    document.getElementById('nombres').value = patient.nombres;
    document.getElementById('apellidos').value = patient.apellidos;
    document.getElementById('dui').value = patient.dui;
    document.getElementById('fechaIns').value = patient.fechaIns;
    document.getElementById('responsable').value = patient.responsable;
    document.getElementById('cel').value = patient.cel;

    modal.show();
}

async function deletePatient(id) {
    const result = await Swal.fire({
        title: '¿Eliminar paciente?',
        text: "Esta acción borrará el registro permanentemente de la nube.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, eliminar ahora',
        cancelButtonText: 'Cancelar',
        background: '#1e293b',
        color: '#f8fafc'
    });

    if (result.isConfirmed) {
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: "ELIMINAR", correlativo: id })
            });

            showToast('Paciente eliminado de la base de datos', 'info');
            setTimeout(fetchPatients, 1500);
        } catch (error) {
            showToast('Error al eliminar el registro', 'error');
        }
    }
}

function prepareAdd() {
    if (patients.length === 0 && !patientsBody.innerHTML.includes('spinner-border')) {
        // This might happen if it's the very first patient ever or if it's still loading
    }

    document.getElementById('modalTitleText').innerText = 'Agregar Paciente';
    document.getElementById('saveBtn').innerText = 'Registrar';
    document.getElementById('editIndex').value = '';
    patientForm.reset();
    document.getElementById('fechaIns').valueAsDate = new Date();

    // Auto-incremental Correlativo logic
    let nextCorr = "0001";
    if (patients.length > 0) {
        const maxCorr = patients.reduce((max, p) => {
            const num = parseInt(p.correlativo);
            return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        nextCorr = (maxCorr + 1).toString().padStart(4, '0');
    }

    document.getElementById('correlativo').value = nextCorr;
}

// Report Functions
function openReportModal() {
    reportModal.show();
    generateReport();
}

function generateReport() {
    const targetMonth = document.getElementById('reportMonth').value;
    if (!targetMonth) return;

    const filtered = patients.filter(p => p.fechaIns && p.fechaIns.startsWith(targetMonth));
    const tbody = document.getElementById('reportTableBody');
    const content = document.getElementById('reportContent');
    const empty = document.getElementById('reportEmpty');
    const title = document.getElementById('reportTitle');
    const total = document.getElementById('reportTotal');

    tbody.innerHTML = '';

    if (filtered.length > 0) {
        content.classList.remove('d-none');
        empty.classList.add('d-none');

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const [year, month] = targetMonth.split('-');
        title.innerText = `Mes: ${monthNames[parseInt(month) - 1]} ${year}`;
        total.innerText = filtered.length;

        filtered.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.correlativo}</td>
                <td>${p.expediente}</td>
                <td>${p.nombres} ${p.apellidos}</td>
                <td>${p.dui}</td>
                <td>${formatDisplayDate(p.fechaIns)}</td>
                <td>${p.responsable || '-'}</td>
                <td>${p.cel}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        content.classList.add('d-none');
        empty.classList.remove('d-none');
    }
}

function printReport() {
    const content = document.getElementById('reportContent').innerHTML;
    const printWindow = window.open('', '', 'height=800,width=1000');

    printWindow.document.write('<html><head><title>Informe Mensual de Pacientes</title>');
    printWindow.document.write('<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">');
    printWindow.document.write('<style>body { padding: 40px; font-family: sans-serif; } .table-dark { background-color: #343a40 !important; color: white !important; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');

    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

// Statistics Logic
function openStatsModal() {
    statsModal.show();
    generateStats();
}

function generateStats() {
    const total = patients.length;
    document.getElementById('statsTotal').innerText = total;

    const now = new Date();
    const currentMonthStr = now.toISOString().substring(0, 7);

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().substring(0, 7);

    const thisMonthPatients = patients.filter(p => p.fechaIns && p.fechaIns.startsWith(currentMonthStr)).length;
    const lastMonthPatients = patients.filter(p => p.fechaIns && p.fechaIns.startsWith(lastMonthStr)).length;

    document.getElementById('statsThisMonth').innerText = thisMonthPatients;

    const diff = thisMonthPatients - lastMonthPatients;
    const growthText = diff >= 0 ?
        `<span class="text-success"><i class="fas fa-arrow-up"></i> +${diff}</span> que el mes pasado` :
        `<span class="text-danger"><i class="fas fa-arrow-down"></i> ${diff}</span> que el mes pasado`;
    document.getElementById('statsGrowth').innerHTML = growthText;

    // Mini Chart (Last 6 Months)
    const chartContainer = document.getElementById('statsChart');
    chartContainer.innerHTML = '';

    const monthsToShow = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        monthsToShow.push(d.toISOString().substring(0, 7));
    }

    const maxMonthCount = Math.max(...monthsToShow.map(m => patients.filter(p => p.fechaIns && p.fechaIns.startsWith(m)).length), 1);

    monthsToShow.forEach(m => {
        const count = patients.filter(p => p.fechaIns && p.fechaIns.startsWith(m)).length;
        const height = (count / maxMonthCount) * 150;
        const monthLabel = new Date(m + '-01T00:00:00').toLocaleDateString('es-SV', { month: 'short' });

        const barWrapper = document.createElement('div');
        barWrapper.className = 'd-flex flex-column align-items-center';
        barWrapper.style.width = '14%';

        barWrapper.innerHTML = `
            <div class="text-primary small fw-bold mb-1">${count}</div>
            <div class="bg-primary rounded-top" style="width: 30px; height: ${height}px; transition: height 1s ease-out; opacity: 0.8;"></div>
            <div class="text-muted small mt-2" style="font-size: 0.7rem;">${monthLabel}</div>
        `;
        chartContainer.appendChild(barWrapper);
    });
}

// Utilities & Formatting
function formatGSDate(gsDate) {
    if (!gsDate) return '';
    const date = new Date(gsDate);
    if (isNaN(date)) return '';
    return date.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-SV', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function showToast(message, icon) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: icon,
        title: message,
        background: '#1e293b',
        color: '#f8fafc'
    });
}

// Search Logic
[searchInput, searchInputMobile].forEach(input => {
    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = patients.filter(p =>
            p.nombres.toLowerCase().includes(term) ||
            p.apellidos.toLowerCase().includes(term) ||
            p.dui.includes(term) ||
            p.expediente.toLowerCase().includes(term) ||
            p.correlativo.toString().includes(term)
        );
        renderPatients(filtered);
    });
});

// Input Masking
function initMasks() {
    const duiInput = document.getElementById('dui');
    const celInput = document.getElementById('cel');

    duiInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 9) val = val.substring(0, 9);
        if (val.length > 8) {
            e.target.value = val.substring(0, 8) + '-' + val.substring(8);
        } else {
            e.target.value = val;
        }
    });

    celInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 8) val = val.substring(0, 8);
        if (val.length > 4) {
            e.target.value = val.substring(0, 4) + '-' + val.substring(4);
        } else {
            e.target.value = val;
        }
    });
}
