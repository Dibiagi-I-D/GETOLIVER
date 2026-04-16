import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './App.css';
import Login from './Login';

const API_URL = '/api/viaticos';

function App() {
  const [usuario, setUsuario] = useState(null); // Usuario logueado
  const [empleados, setEmpleados] = useState([]);
  const [selectedEmpleados, setSelectedEmpleados] = useState([]);
  const [empresa, setEmpresa] = useState('DIBIAG');
  const hoy = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
  const [fechaMov, setFechaMov] = useState(hoy);
  const [fechaIni, setFechaIni] = useState(hoy);
  const [textoSJTPAH, setTextoSJTPAH] = useState('');
  const [textoSJTPAI, setTextoSJTPAI] = useState('');
  const [siguienteNroFor, setSiguienteNroFor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [datosExcel, setDatosExcel] = useState(null); // Datos para descargar Excel

  // Función de login
  const handleLogin = (usuarioLogueado) => {
    const tiempoLogin = Date.now();
    setUsuario(usuarioLogueado);
    localStorage.setItem('usuario', usuarioLogueado);
    localStorage.setItem('loginTime', tiempoLogin.toString());
    localStorage.setItem('lastActivity', tiempoLogin.toString());
  };

  // Función de logout
  const handleLogout = () => {
    setUsuario(null);
    localStorage.removeItem('usuario');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('lastActivity');
    setSelectedEmpleados([]);
    setSearchTerm('');
  };

  // Verificar si hay usuario guardado en localStorage
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario');
    const lastActivity = localStorage.getItem('lastActivity');
    
    if (usuarioGuardado && lastActivity) {
      const tiempoInactivo = Date.now() - parseInt(lastActivity);
      const CINCO_MINUTOS = 5 * 60 * 1000; // 5 minutos en milisegundos
      
      if (tiempoInactivo > CINCO_MINUTOS) {
        // Sesión expirada por inactividad
        console.log('⏰ Sesión expirada por inactividad');
        handleLogout();
      } else {
        setUsuario(usuarioGuardado);
      }
    }
  }, []);

  // Detector de actividad del usuario (mouse, teclado, scroll)
  useEffect(() => {
    if (!usuario) return;

    const actualizarActividad = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    // Eventos que indican actividad del usuario
    window.addEventListener('mousemove', actualizarActividad);
    window.addEventListener('keydown', actualizarActividad);
    window.addEventListener('scroll', actualizarActividad);
    window.addEventListener('click', actualizarActividad);

    return () => {
      window.removeEventListener('mousemove', actualizarActividad);
      window.removeEventListener('keydown', actualizarActividad);
      window.removeEventListener('scroll', actualizarActividad);
      window.removeEventListener('click', actualizarActividad);
    };
  }, [usuario]);

  // Timer de inactividad - verificar cada 30 segundos
  useEffect(() => {
    if (!usuario) return;

    const intervalo = setInterval(() => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const tiempoInactivo = Date.now() - parseInt(lastActivity);
        const CINCO_MINUTOS = 5 * 60 * 1000;
        
        if (tiempoInactivo > CINCO_MINUTOS) {
          console.log('⏰ Sesión expirada por inactividad (5 minutos)');
          showMessage('Sesión expirada por inactividad. Por favor, inicie sesión nuevamente.', 'error');
          setTimeout(() => handleLogout(), 2000);
        }
      }
    }, 30000); // Verificar cada 30 segundos

    return () => clearInterval(intervalo);
  }, [usuario]);

  // Limpiar sesión al cerrar/recargar la página
  useEffect(() => {
    const limpiarSesion = () => {
      console.log('🚪 Cerrando sesión al salir/recargar');
      localStorage.removeItem('usuario');
      localStorage.removeItem('loginTime');
      localStorage.removeItem('lastActivity');
    };

    window.addEventListener('beforeunload', limpiarSesion);
    
    return () => {
      window.removeEventListener('beforeunload', limpiarSesion);
    };
  }, []);

  // Funciones principales
  const cargarEmpleados = async () => {
    try {
      const response = await axios.get(`${API_URL}/empleados?empresa=${empresa}`);
      if (response.data.success) {
        console.log('Empleados cargados:', response.data.empleados);
        setEmpleados(response.data.empleados);
      }
    } catch (error) {
      console.error('Error al cargar empleados:', error);
      showMessage('Error al cargar la lista de empleados', 'error');
    }
  };

  const cargarSiguienteNroFor = async () => {
    try {
      const response = await axios.get(`${API_URL}/ultimo-nrofor?empresa=${empresa}`);
      if (response.data.success) {
        setSiguienteNroFor(response.data.siguienteNroFor);
      }
    } catch (error) {
      console.error('Error al cargar siguiente NROFOR:', error);
      showMessage('Error al obtener el número de formulario', 'error');
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    // Auto-cerrar después de 8 segundos (pero el usuario puede cerrar antes)
    setTimeout(() => setMessage(null), 8000);
  };

  // Función para descargar Excel con datos de los choferes
  const descargarExcel = async (choferesData, fechaPago) => {
    try {
      console.log('📊 Datos recibidos para Excel:', choferesData);

      // Crear datos del Excel con el formato actualizado
      const datosFilas = choferesData.map((chofer) => {
        const cuil = chofer.nrodoc ? String(chofer.nrodoc).trim() : 'SIN CUIL';
        const nombre = chofer.nombre ? String(chofer.nombre).trim() : 'SIN NOMBRE';
        const legajo = chofer.nroleg ? String(chofer.nroleg).trim() : '';
        const cbu = chofer.cbu ? String(chofer.cbu).trim() : 'SIN CBU';
        const banco = chofer.banco ? String(chofer.banco).trim() : 'SIN BANCO';
        
        return {
          'Empresa': empresa,
          'Legajo': legajo,
          'Razón social del beneficiario (Opcional)': nombre,
          'Tipo de document': 'CUIL',
          'CUIT / CUIL': cuil,
          'Fecha de pago': fechaPago,
          'Importe del pago': '$ 100.000,00',
          'Banco': banco,
          'CBU': cbu,
        };
      });

      // Agregar fila de TOTAL al final
      const totalImporte = choferesData.length * 100000;
      const totalFormateado = totalImporte.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      datosFilas.push({
        'Empresa': '',
        'Legajo': '',
        'Razón social del beneficiario (Opcional)': '',
        'Tipo de document': '',
        'CUIT / CUIL': '',
        'Fecha de pago': 'TOTAL',
        'Importe del pago': `$ ${totalFormateado}`,
        'Banco': '',
        'CBU': '',
      });

      // Agregar fila de CANTIDAD DE PERSONAS
      datosFilas.push({
        'Empresa': '',
        'Legajo': '',
        'Razón social del beneficiario (Opcional)': '',
        'Tipo de document': '',
        'CUIT / CUIL': '',
        'Fecha de pago': 'CANTIDAD DE PERSONAS',
        'Importe del pago': choferesData.length,
        'Banco': '',
        'CBU': '',
      });

      // Crear worksheet
      const ws = XLSX.utils.json_to_sheet(datosFilas);

      // Ajustar ancho de columnas
      ws['!cols'] = [
        { wch: 12 }, // Empresa
        { wch: 10 }, // Legajo
        { wch: 35 }, // Razón social
        { wch: 10 }, // Tipo doc
        { wch: 15 }, // CUIT/CUIL
        { wch: 14 }, // Fecha pago
        { wch: 18 }, // Importe
        { wch: 12 }, // Banco
        { wch: 24 }, // CBU
      ];

      // Crear workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Viáticos');

      // Generar archivo y descargar
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fechaArchivo = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
      saveAs(blob, `Viaticos_${fechaArchivo}.xlsx`);

      console.log('✅ Excel descargado correctamente');
    } catch (error) {
      console.error('Error al generar Excel:', error);
      showMessage('❌ Error al generar el archivo Excel', 'error');
    }
  };

  // Función para descargar PDF con datos de los choferes
  const descargarPDF = async (choferesData, fechaPago) => {
    try {
      console.log('📄 Datos recibidos para PDF:', choferesData);

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Título
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Anticipos de Viáticos', 148, 15, { align: 'center' });

      // Subtítulo con fecha de generación
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const fechaGeneracion = new Date().toLocaleString('es-AR');
      doc.text(`Generado: ${fechaGeneracion}`, 148, 22, { align: 'center' });

      // Preparar datos de la tabla
      const bodyData = choferesData.map((chofer) => {
        const cuil = chofer.nrodoc ? String(chofer.nrodoc).trim() : 'SIN CUIL';
        const nombre = chofer.nombre ? String(chofer.nombre).trim() : 'SIN NOMBRE';
        const legajo = chofer.nroleg ? String(chofer.nroleg).trim() : '';
        const cbu = chofer.cbu ? String(chofer.cbu).trim() : 'SIN CBU';
        const banco = chofer.banco ? String(chofer.banco).trim() : 'SIN BANCO';
        
        return [empresa, legajo, nombre, 'CUIL', cuil, fechaPago, '$ 100.000,00', banco, cbu];
      });

      // Fila de TOTAL
      const totalImporte = choferesData.length * 100000;
      const totalFormateado = totalImporte.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      bodyData.push(['', '', '', '', '', 'TOTAL', `$ ${totalFormateado}`, '', '']);

      // Fila de CANTIDAD DE PERSONAS
      bodyData.push(['', '', '', '', '', 'CANTIDAD DE PERSONAS', choferesData.length, '', '']);

      // Generar tabla
      autoTable(doc, {
        startY: 28,
        head: [['Empresa', 'Legajo', 'Razón social del beneficiario', 'Tipo doc', 'CUIT / CUIL', 'Fecha de pago', 'Importe del pago', 'Banco', 'CBU']],
        body: bodyData,
        theme: 'grid',
        headStyles: {
          fillColor: [102, 126, 234],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 22, halign: 'center' },  // Empresa
          1: { cellWidth: 16, halign: 'center' },  // Legajo
          2: { cellWidth: 50 },                    // Razón social
          3: { cellWidth: 18, halign: 'center' },  // Tipo doc
          4: { cellWidth: 28, halign: 'center' },  // CUIL
          5: { cellWidth: 24, halign: 'center' },  // Fecha
          6: { cellWidth: 30, halign: 'right' },   // Importe
          7: { cellWidth: 22, halign: 'center' },  // Banco
          8: { cellWidth: 38, halign: 'center' },  // CBU
        },
        didParseCell: function (data) {
          // Estilo especial para filas TOTAL y CANTIDAD DE PERSONAS (últimas 2 filas)
          if (data.row.index >= bodyData.length - 2) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
        margin: { left: 10, right: 10 },
      });

      // Guardar
      const fechaArchivo = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
      doc.save(`Viaticos_${fechaArchivo}.pdf`);

      console.log('✅ PDF descargado correctamente');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      showMessage('❌ Error al generar el archivo PDF', 'error');
    }
  };

  // Función para obtener CUIL y descargar
  const handleDescargarExcel = async () => {
    if (!datosExcel) return;

    try {
      const response = await axios.post(`${API_URL}/cuil-choferes`, {
        empresa: datosExcel.empresa,
        nrolegajos: datosExcel.nrolegajos,
      });

      if (response.data.success) {
        // Formatear fecha de pago como DD/MM/YYYY
        const partesFecha = datosExcel.fechaPago.split('-'); // YYYY-MM-DD
        const fechaFormateada = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
        
        await descargarExcel(response.data.choferes, fechaFormateada);
      }
    } catch (error) {
      console.error('Error al obtener datos para Excel:', error);
      showMessage('❌ Error al obtener datos de CUIL para el Excel', 'error');
    }
  };

  // Función para obtener CUIL y descargar PDF (producción)
  const handleDescargarPDF = async () => {
    if (!datosExcel) return;

    try {
      const response = await axios.post(`${API_URL}/cuil-choferes`, {
        empresa: datosExcel.empresa,
        nrolegajos: datosExcel.nrolegajos,
      });

      if (response.data.success) {
        const partesFecha = datosExcel.fechaPago.split('-');
        const fechaFormateada = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
        
        await descargarPDF(response.data.choferes, fechaFormateada);
      }
    } catch (error) {
      console.error('Error al obtener datos para PDF:', error);
      showMessage('❌ Error al obtener datos de CUIL para el PDF', 'error');
    }
  };

  // Función para probar Excel SIN insertar en la BD
  const probarExcel = async () => {
    if (selectedEmpleados.length === 0) {
      showMessage('Debe seleccionar al menos un empleado', 'error');
      return;
    }
    if (!fechaMov) {
      showMessage('Debe completar la fecha de movimiento', 'error');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/cuil-choferes`, {
        empresa,
        nrolegajos: selectedEmpleados,
      });

      if (response.data.success) {
        const partesFecha = fechaMov.split('-');
        const fechaFormateada = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
        await descargarExcel(response.data.choferes, fechaFormateada);
        showMessage('🧪 Excel de prueba descargado correctamente (NO se insertó nada en la BD)', 'success');
      }
    } catch (error) {
      console.error('Error al probar Excel:', error);
      showMessage('❌ Error al generar el Excel de prueba', 'error');
    }
  };

  // Función para probar PDF SIN insertar en la BD
  const probarPDF = async () => {
    if (selectedEmpleados.length === 0) {
      showMessage('Debe seleccionar al menos un empleado', 'error');
      return;
    }
    if (!fechaMov) {
      showMessage('Debe completar la fecha de movimiento', 'error');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/cuil-choferes`, {
        empresa,
        nrolegajos: selectedEmpleados,
      });

      if (response.data.success) {
        const partesFecha = fechaMov.split('-');
        const fechaFormateada = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
        await descargarPDF(response.data.choferes, fechaFormateada);
        showMessage('🧪 PDF de prueba descargado correctamente (NO se insertó nada en la BD)', 'success');
      }
    } catch (error) {
      console.error('Error al probar PDF:', error);
      showMessage('❌ Error al generar el PDF de prueba', 'error');
    }
  };

  const handleEmpleadoToggle = (nroleg) => {
    setSelectedEmpleados((prev) =>
      prev.includes(nroleg)
        ? prev.filter((n) => n !== nroleg)
        : [...prev, nroleg]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedEmpleados.length === 0) {
      showMessage('Debe seleccionar al menos un empleado', 'error');
      return;
    }

    if (!fechaMov || !fechaIni) {
      showMessage('Debe completar todas las fechas', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/insertar`, {
        empresa,
        usuario,
        nrolegajos: selectedEmpleados,
        fechaMov,
        fechaIni,
        textoSJTPAH,
        textoSJTPAI,
      });

      if (response.data.success) {
        // Guardar datos para la descarga del Excel ANTES de limpiar
        setDatosExcel({
          empresa,
          nrolegajos: [...selectedEmpleados],
          fechaPago: fechaMov,
        });

        showMessage(
          `✅ Viáticos insertados correctamente!\n${response.data.resultados.length} registro(s) guardado(s) exitosamente.`,
          'success'
        );
        
        // Limpiar formulario
        setSelectedEmpleados([]);
        setFechaMov(new Date().toISOString().split('T')[0]);
        setFechaIni(new Date().toISOString().split('T')[0]);
        setTextoSJTPAH('');
        setTextoSJTPAI('');
        
        // Recargar siguiente NROFOR
        await cargarSiguienteNroFor();
      }
    } catch (error) {
      console.error('Error al insertar viáticos:', error);
      showMessage(
        `❌ ${error.response?.data?.message || 'Error al insertar los viáticos'}`,
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de empleados con useMemo para mejor rendimiento
  const empleadosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) {
      return empleados;
    }
    
    const term = searchTerm.trim().toLowerCase();
    console.log('🔍 Buscando:', term);
    
    // Separar en tres grupos por relevancia
    const exactos = [];
    const empiezan = [];
    const contienen = [];
    
    empleados.forEach(emp => {
      const legajo = String(emp.nroleg || '').trim().toLowerCase();
      const nombre = String(emp.nombre || '').toLowerCase();
      
      // Verificar coincidencias
      const legajoCoincide = legajo.includes(term);
      const nombreCoincide = nombre.includes(term);
      
      if (!legajoCoincide && !nombreCoincide) {
        return; // No coincide, saltar
      }
      
      // Clasificar por tipo de coincidencia
      if (legajo === term || nombre === term) {
        exactos.push(emp);
      } else if (legajo.startsWith(term) || nombre.startsWith(term)) {
        empiezan.push(emp);
      } else {
        contienen.push(emp);
      }
    });
    
    // Asignar puntuación para ordenar
    const conScore = [
      ...exactos.map(emp => ({ ...emp, score: 1000 })),
      ...empiezan.map(emp => {
        const legajo = String(emp.nroleg || '').trim().toLowerCase();
        const nombre = String(emp.nombre || '').toLowerCase();
        const term = searchTerm.trim().toLowerCase();
        return {
          ...emp,
          score: legajo.startsWith(term) ? 900 : 800
        };
      }),
      ...contienen.map(emp => ({ ...emp, score: 700 }))
    ];
    
    // Ordenar por score y luego por nombre
    const resultado = conScore
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.nombre.localeCompare(b.nombre);
      })
      .map(({ score, ...emp }) => emp);
    
    console.log('✅ Resultados encontrados:', resultado.length);
    console.log('  - Exactos:', exactos.length);
    console.log('  - Empiezan con:', empiezan.length);
    console.log('  - Contienen:', contienen.length);
    
    return resultado;
  }, [empleados, searchTerm]);

  // Cargar datos iniciales cuando cambia la empresa
  useEffect(() => {
    if (usuario) {
      cargarEmpleados();
      cargarSiguienteNroFor();
    }
  }, [empresa, usuario]);

  // Si no hay usuario logueado, mostrar login
  if (!usuario) {
    return <Login onLogin={handleLogin} />;
  }

  const handleSelectAll = () => {
    if (selectedEmpleados.length === empleadosFiltrados.length) {
      setSelectedEmpleados([]);
    } else {
      setSelectedEmpleados(empleadosFiltrados.map((e) => e.nroleg));
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🧾 Sistema de Carga de Viáticos</h1>
          <p>Carga masiva de anticipos de viáticos (ANTV)</p>
        </header>

        {message && (
          <div className="modal-overlay">
            <div className={`modal-message ${message.type}`}>
              <div className="modal-message-content">
                {message.text.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <div className="modal-buttons">
                {message.type === 'success' && datosExcel && (
                  <>
                    <button 
                      className="modal-excel-btn"
                      onClick={handleDescargarExcel}
                    >
                      📥 Descargar Excel
                    </button>
                    <button 
                      className="modal-pdf-btn"
                      onClick={handleDescargarPDF}
                    >
                      📄 Descargar PDF
                    </button>
                  </>
                )}
                <button 
                  className="modal-close-btn"
                  onClick={() => { setMessage(null); setDatosExcel(null); }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="form-section" style={{marginBottom: '20px'}}>
          <h2>🏢 Empresa</h2>
          <div className="form-group">
            <label htmlFor="empresa">Seleccione la empresa *</label>
            <select
              id="empresa"
              value={empresa}
              onChange={(e) => {
                setEmpresa(e.target.value);
                setSelectedEmpleados([]); // Limpiar selección al cambiar empresa
                setSearchTerm(''); // Limpiar búsqueda
              }}
              className="empresa-select"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="DIBIAG">DIBIAG</option>
              <option value="MULTIM">MULTIMODAL</option>
            </select>
          </div>
        </div>

        <div className="info-card">
          <div className="info-item">
            <strong>CODFOR:</strong> ANTV
          </div>
          <div className="info-item">
            <strong>Siguiente NROFOR:</strong> {siguienteNroFor || 'Cargando...'}
          </div>
          <div className="info-item">
            <strong>EMPLEG:</strong> {empresa}
          </div>
          <div className="info-item">
            <strong>IMPORT:</strong> $100,000.00
          </div>
          <div className="info-item">
            <strong>CUOTAS:</strong> 1
          </div>
          <div className="info-item">
            <strong>STATUS:</strong> MENSUAL
          </div>
          <div className="info-item">
            <strong>TIPCPT:</strong> sueldos
          </div>
          <div className="info-item">
            <strong>CODCPT:</strong> ANTVIA
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-section">
            <h2>📅 Fechas</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fechaMov">Fecha de Movimiento *</label>
                <input
                  type="date"
                  id="fechaMov"
                  value={fechaMov}
                  onChange={(e) => setFechaMov(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="fechaIni">Fecha de Inicio *</label>
                <input
                  type="date"
                  id="fechaIni"
                  value={fechaIni}
                  onChange={(e) => setFechaIni(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>📝 Descripciones</h2>
            <div className="form-group">
              <label htmlFor="textoSJTPAH">Descripción SJTPAH</label>
              <textarea
                id="textoSJTPAH"
                value={textoSJTPAH}
                onChange={(e) => setTextoSJTPAH(e.target.value)}
                rows="3"
                placeholder="Ingrese una descripción para SJTPAH..."
              />
            </div>
            <div className="form-group">
              <label htmlFor="textoSJTPAI">Descripción SJTPAI</label>
              <textarea
                id="textoSJTPAI"
                value={textoSJTPAI}
                onChange={(e) => setTextoSJTPAI(e.target.value)}
                rows="3"
                placeholder="Ingrese una descripción para SJTPAI..."
              />
            </div>
          </div>

          <div className="form-section">
            <div className="empleados-header">
              <h2>👥 Empleados ({selectedEmpleados.length} seleccionados de {empleadosFiltrados.length})</h2>
              <button
                type="button"
                onClick={handleSelectAll}
                className="btn-secondary"
              >
                {selectedEmpleados.length === empleadosFiltrados.length
                  ? 'Deseleccionar Todos'
                  : 'Seleccionar Todos'}
              </button>
            </div>
            
            <div className="form-group">
              <input
                type="text"
                placeholder="🔍 Buscar por legajo o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <small style={{color: '#666', marginTop: '5px', display: 'block'}}>
                  Mostrando {empleadosFiltrados.length} de {empleados.length} empleados
                </small>
              )}
            </div>

            <div className="empleados-list" key={`list-${searchTerm}-${empleadosFiltrados.length}`}>
              {empleadosFiltrados.length === 0 ? (
                <p className="no-results">No se encontraron empleados</p>
              ) : (
                empleadosFiltrados.map((empleado) => (
                  <label key={empleado.nroleg} className="empleado-item">
                    <input
                      type="checkbox"
                      checked={selectedEmpleados.includes(empleado.nroleg)}
                      onChange={() => handleEmpleadoToggle(empleado.nroleg)}
                    />
                    <span className="empleado-info">
                      <strong>Legajo: {empleado.nroleg}</strong>
                      <small>{empleado.nombre}</small>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Panel de choferes seleccionados */}
          {selectedEmpleados.length > 0 && (
            <div className="seleccionados-panel">
              <div className="seleccionados-header">
                <h2>✅ Choferes Seleccionados ({selectedEmpleados.length})</h2>
                <button
                  type="button"
                  className="btn-limpiar"
                  onClick={() => setSelectedEmpleados([])}
                >
                  🗑️ Limpiar todos
                </button>
              </div>
              <div className="seleccionados-lista">
                {selectedEmpleados.map((nroleg) => {
                  const emp = empleados.find((e) => e.nroleg === nroleg);
                  return (
                    <div key={nroleg} className="seleccionado-chip">
                      <span className="seleccionado-info">
                        <strong>{nroleg}</strong> - {emp ? emp.nombre : 'N/A'}
                      </span>
                      <button
                        type="button"
                        className="seleccionado-remove"
                        onClick={() => handleEmpleadoToggle(nroleg)}
                        title="Quitar"
                      >
                        ✖
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="botones-accion">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || selectedEmpleados.length === 0}
            >
              {loading ? '⏳ Insertando...' : '✅ Insertar Viáticos'}
            </button>
            <button
              type="button"
              className="btn-probar-excel"
              disabled={loading || selectedEmpleados.length === 0}
              onClick={probarExcel}
            >
              🧪 Probar Excel
            </button>
            <button
              type="button"
              className="btn-probar-pdf"
              disabled={loading || selectedEmpleados.length === 0}
              onClick={probarPDF}
            >
              🧪 Probar PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
