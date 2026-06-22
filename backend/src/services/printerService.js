import pkg from 'node-thermal-printer';
const { printer: Printer, types: Types } = pkg;

// Configuración de IPs de red para las impresoras de tickets en cada área
const PRINTER_IPS = {
  'Barra Fría': process.env.PRINTER_BARRA_FRIA_IP || '192.168.1.200',
  'Cocina Caliente': process.env.PRINTER_COCINA_CALIENTE_IP || '192.168.1.201',
  'Bebidas': process.env.PRINTER_BEBIDAS_IP || '192.168.1.202',
  'Caja': process.env.PRINTER_CAJA_IP || '192.168.1.203'
};

// Generar una vista ASCII de prueba en la consola para desarrollo/depuración (Cocina)
const logAsciiTicket = (order, area, items) => {
  console.log('\n========================================');
  console.log(`=== SIMULADOR IMPRESORA TÉRMICA (80mm) ===`);
  console.log(`=== ÁREA: ${area.toUpperCase()} ===`);
  console.log('========================================');
  console.log('       MARISQUERÍA EL TÍO PERRO');
  console.log(`        TICKET DE PREPARACIÓN`);
  console.log('----------------------------------------');
  console.log(`Mesa: ${order.table?.number || 'S/N'}       Capacidad: ${order.table?.capacity || 0} pax`);
  console.log(`Folio: ${order._id.toString().slice(-6).toUpperCase()}`);
  console.log(`Fecha: ${new Date().toLocaleString('es-MX')}`);
  console.log('----------------------------------------');
  console.log(String('CANT').padEnd(6) + 'PLATILLO / DETALLES');
  console.log('----------------------------------------');
  
  items.forEach(item => {
    console.log(String(item.quantity).padEnd(6) + item.menuItem.name.toUpperCase());
    if (item.notes) {
      console.log(`  * NOTA: ${item.notes}`);
    }
  });
  
  console.log('----------------------------------------');
  console.log('          --- EN COLA ---');
  console.log('========================================\n');
};

// Generar una vista ASCII de prueba en la consola para desarrollo/depuración (Cobro/Caja)
const logReceiptAscii = (order, payment, change, remaining, customer, cashierUser) => {
  console.log('\n========================================');
  console.log(`=== SIMULADOR IMPRESORA TÉRMICA (80mm) ===`);
  console.log(`=== TICKET DE COBRO (CAJA) ===`);
  console.log('========================================');
  console.log('       MARISQUERÍA EL TÍO PERRO');
  console.log('            RFC: TP-990812-MAR');
  console.log('      Av. Costera Miguel Aleman #120');
  console.log('           Acapulco, Guerrero');
  console.log('           Tel: 744-123-4567');
  console.log('----------------------------------------');
  console.log(`Mesa: ${order.table?.number || 'S/N'}`);
  console.log(`Folio Pago: ${payment._id.toString().slice(-6).toUpperCase()}`);
  console.log(`Fecha: ${new Date(payment.createdAt).toLocaleString('es-MX')}`);
  if (cashierUser) {
    console.log(`Cajero: ${cashierUser.name} (${cashierUser.role})`);
  }
  console.log('----------------------------------------');
  console.log(String('CANT').padEnd(6) + String('DESCRIPCION').padEnd(24) + 'SUBTOTAL');
  console.log('----------------------------------------');
  
  order.items.forEach(item => {
    const price = item.menuItem?.price || 0;
    const subtotal = price * item.quantity;
    const nameStr = item.menuItem?.name ? item.menuItem.name.toUpperCase() : 'PLATILLO';
    console.log(String(item.quantity).padEnd(6) + nameStr.padEnd(24) + `$${subtotal.toFixed(2)}`);
  });
  
  console.log('----------------------------------------');
  console.log(`TOTAL DE ORDEN:`.padEnd(30) + `$${order.total.toFixed(2)}`);
  console.log(`MONTO COBRADO (${payment.method.toUpperCase()}):`.padEnd(30) + `$${payment.amount.toFixed(2)}`);
  console.log(`CAMBIO (VUELTO):`.padEnd(30) + `$${change.toFixed(2)}`);
  console.log(`SALDO RESTANTE MESA:`.padEnd(30) + `$${remaining.toFixed(2)}`);
  
  if (customer) {
    console.log('----------------------------------------');
    console.log('          PROGRAMA DE LEALTAD');
    console.log(`Cliente: ${customer.name}`);
    console.log(`Puntos Acumulados: ${customer.loyaltyPoints} pts`);
    const pointsEarned = Math.round(payment.amount * 0.10);
    console.log(`Puntos Ganados Hoy: +${pointsEarned} pts`);
  }
  
  console.log('----------------------------------------');
  console.log('       ¡GRACIAS POR SU VISITA!');
  console.log('========================================\n');
};

// Servicio de impresión de comanda por áreas de preparación
export const printKitchenTicket = async (order) => {
  // Separar los platillos de la comanda por sus áreas destinadas
  const areas = ['Barra Fría', 'Cocina Caliente', 'Bebidas'];

  for (const area of areas) {
    const areaItems = order.items.filter(item => item.area === area);
    
    // Si no hay platillos para esta área en la comanda, saltamos
    if (areaItems.length === 0) continue;

    const ipAddress = PRINTER_IPS[area];

    // Siempre simulamos en consola para fines de desarrollo
    logAsciiTicket(order, area, areaItems);

    try {
      // Inicializar la impresora de tickets ESC/POS en red
      const printer = new Printer({
        type: Types.EPSON, // Modelo Epson TM-T88 o compatible ESC/POS
        interface: `tcp://${ipAddress}`, // Interfaz TCP/IP en puerto por defecto (9100)
        characterSet: 'SLOVENIA', // Codificación latinoamericana/española
        removeSpecialCharacters: false,
        lineCharacter: '-'
      });

      // Cabecera del Ticket
      printer.alignCenter();
      printer.bold(true);
      printer.setTextSize(1, 1);
      printer.println('MARISQUERIA EL TIO PERRO');
      printer.bold(false);
      printer.setTextNormal();
      printer.println(`TICKET DE PREPARACION: ${area.toUpperCase()}`);
      printer.println('--------------------------------');

      // Información de Mesa y Hora
      printer.alignLeft();
      printer.println(`MESA: ${order.table?.number || 'S/N'}`);
      printer.println(`FOLIO: ${order._id.toString().slice(-6).toUpperCase()}`);
      printer.println(`FECHA: ${new Date(order.createdAt).toLocaleString('es-MX')}`);
      printer.println('--------------------------------');

      // Detalle de los Platillos
      printer.table(['CANT', 'PLATILLO']);
      printer.println('--------------------------------');

      for (const item of areaItems) {
        printer.table([
          item.quantity.toString(),
          item.menuItem.name
        ]);
        if (item.notes) {
          printer.println(`   * NOTA: ${item.notes}`);
        }
      }

      printer.println('--------------------------------');
      printer.alignCenter();
      printer.println('NUEVA COMANDA RECIBIDA');
      
      // Cortar el papel
      printer.cut();

      // Ejecutar la conexión de socket TCP e impresión
      // Se establece un timeout corto para no retrasar el hilo principal
      await Promise.race([
        printer.execute(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexión a impresora')), 3000))
      ]);
      
      console.log(`Ticket de ${area} enviado exitosamente a la impresora en ${ipAddress}`);
    } catch (error) {
      // Si falla, ya imprimimos en consola la advertencia y el ticket ASCII simulado
      console.warn(`Impresora física de ${area} (${ipAddress}) desconectada o fuera de línea. Detalle: ${error.message}`);
    }
  }
};

// Servicio de impresión de ticket de cobro (Caja / Factura)
export const printReceiptTicket = async (order, payment, change, remaining, customer, cashierUser) => {
  const ipAddress = PRINTER_IPS['Caja'];

  // Siempre simulamos en consola para fines de desarrollo
  logReceiptAscii(order, payment, change, remaining, customer, cashierUser);

  try {
    // Inicializar la impresora de tickets ESC/POS en red
    const printer = new Printer({
      type: Types.EPSON, // Modelo Epson TM-T88 o compatible ESC/POS
      interface: `tcp://${ipAddress}`, // Interfaz TCP/IP en puerto por defecto (9100)
      characterSet: 'SLOVENIA', // Codificación latinoamericana/española
      removeSpecialCharacters: false,
      lineCharacter: '-'
    });

    // Cabecera del Ticket
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println('MARISQUERIA EL TIO PERRO');
    printer.setTextNormal();
    printer.println('RFC: TP-990812-MAR');
    printer.println('Av. Costera Miguel Aleman #120');
    printer.println('Acapulco, Guerrero');
    printer.println('Tel: 744-123-4567');
    printer.println('--------------------------------');

    // Información de Venta
    printer.alignLeft();
    printer.println(`TICKET DE PAGO - FOLIO: ${payment._id.toString().slice(-6).toUpperCase()}`);
    printer.println(`FECHA: ${new Date(payment.createdAt).toLocaleString('es-MX')}`);
    printer.println(`MESA: ${order.table?.number || 'S/N'}`);
    if (cashierUser) {
      printer.println(`CAJERO: ${cashierUser.name}`);
    }
    printer.println('--------------------------------');

    // Detalle de los Platillos
    printer.table(['CANT', 'PLATILLO', 'PRECIO']);
    printer.println('--------------------------------');

    order.items.forEach(item => {
      const price = item.menuItem?.price || 0;
      const subtotal = price * item.quantity;
      const itemName = item.menuItem?.name ? item.menuItem.name.substring(0, 18) : 'Platillo';
      printer.table([
        item.quantity.toString(),
        itemName,
        `$${subtotal.toFixed(2)}`
      ]);
    });

    printer.println('--------------------------------');

    // Totales
    printer.alignRight();
    printer.println(`TOTAL ORDEN: $${order.total.toFixed(2)}`);
    printer.println(`MONTO COBRADO: $${payment.amount.toFixed(2)}`);
    if (payment.method) {
      printer.println(`METODO: ${payment.method.toUpperCase()}`);
    }
    printer.println(`CAMBIO (VUELTO): $${change.toFixed(2)}`);
    printer.println(`RESTANTE DE MESA: $${remaining.toFixed(2)}`);

    // Puntos de lealtad
    if (customer) {
      printer.println('--------------------------------');
      printer.alignCenter();
      printer.bold(true);
      printer.println('PROGRAMA DE LEALTAD');
      printer.bold(false);
      printer.alignLeft();
      printer.println(`CLIENTE: ${customer.name}`);
      printer.println(`PUNTOS ACUMULADOS: ${customer.loyaltyPoints} pts`);
      const pointsEarned = Math.round(payment.amount * 0.10);
      printer.println(`PUNTOS GANADOS HOY: +${pointsEarned} pts`);
    }

    printer.println('--------------------------------');
    printer.alignCenter();
    printer.println('¡GRACIAS POR SU VISITA!');
    printer.println('EL TIO PERRO LE DESEA EXCELENTE DIA');

    // Abrir cajón de dinero automáticamente
    try {
      printer.openCashDrawer();
    } catch (e) {
      console.warn('No se pudo enviar pulso de apertura a cajón.');
    }

    // Cortar el papel
    printer.cut();

    // Ejecutar la impresión
    await Promise.race([
      printer.execute(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexión a impresora de caja')), 3000))
    ]);

    console.log(`Ticket de cobro enviado exitosamente a la impresora en ${ipAddress}`);
  } catch (error) {
    console.warn(`Impresora física de caja (${ipAddress}) fuera de línea. Detalle: ${error.message}`);
  }
};
