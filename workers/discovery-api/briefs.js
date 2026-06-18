export const BRIEFS = {
  "registro-visitas-acompanantes": {
    title: "Registro de Visitas y Acompañantes de Menores",
    area: "Accesos y Recepción",
    stakeholder: "Andrea Leyva",
    rol: "Accesos y auditoría de invitados",
    context: `Estás entrevistando a Andrea Leyva, quien trabaja en accesos y auditoría de invitados del Club de Golf Tres Marías en Morelia, Michoacán.

Estamos diseñando mejoras al sistema MyFrac para digitalizar dos flujos: (1) el registro de invitados con cupones, y (2) el registro de acompañantes de menores. Hoy ambos dependen parcialmente de Google Sheets y bitácoras en papel.

Ya tuvimos una llamada con Andrea el 17 de junio donde entendimos los procesos actuales. Ahora necesitamos resolver preguntas específicas que quedaron abiertas para completar el diseño de la solución. Las respuestas de Andrea van directo al Product Brief que recibe el equipo de desarrollo (Kiritek).

IMPORTANTE: Estas son preguntas operativas específicas, no una entrevista exploratoria. Andrea ya nos dio el panorama general — ahora necesitamos datos puntuales. Sé directo y concreto.`,
    questions: [
      "¿Cuántos invitados se registran por semana aproximadamente? ¿Y cuántos acompañantes de menores están activos hoy en el Sheets?",
      "Sobre los roles y permisos en MyFrac: ¿qué roles existen hoy? ¿Qué debería poder hacer cada uno — alta, edición, consulta, reportes? ¿Tú tienes un rol especial de auditoría?",
      "Los cupones de menor dicen 3-10 años, pero en el Sheets de acompañantes hay menores de 16-17 años. ¿Hasta qué edad aplica el proceso de acompañante de menor?",
      "¿Cómo se da de baja a un acompañante hoy? ¿El socio avisa formalmente? ¿Y si quiere cambiar de acompañante — ya no viene una persona y ahora viene otra?",
      "¿Hay un formato estándar del CxC (cuenta por cobrar) que se pueda digitalizar? ¿Cómo funciona ese proceso hoy?",
      "En el Sheets hay socios que compran paquetes de 20 ingresos. ¿Cómo funciona? ¿Pago directo en caja? ¿Bloque de brazaletes? ¿El saldo se lleva en el Sheets?",
      "¿Cuántos operadores de accesos no tienen cuenta en MyFrac? ¿Quiénes son? ¿Por qué no se les ha dado — licencias, no se ha pedido, o Kiritek no las ha activado?",
      "Cuando un hijo de socio cumple 26 años y pierde la membresía, ¿cómo funciona para que entre como invitado? ¿Hace trámite especial o simplemente llega con cupón?",
      "En las observaciones del Sheets hay discrepancias entre número de acción en Tablet y en Clubes/Cibermundo. ¿Es frecuente? ¿Por qué pasa?",
    ],
  },

  "ventas-cc": {
    title: "Ventas de Centros de Consumo",
    area: "Centros de Consumo",
    stakeholder: "Operador de A&B",
    rol: "Gerente de Alimentos y Bebidas",
    context: `Estás entrevistando a un operador del Club de Golf Tres Marías, un club deportivo y social en Morelia, Michoacán. El área de centros de consumo incluye restaurante, bar, snack bar y eventos de alimentos.

El objetivo de esta entrevista es entender cómo trabaja esta persona hoy, qué información necesita, qué problemas enfrenta, y qué herramientas le ayudarían. Esto alimenta el diseño de un dashboard o herramienta digital.`,
    questions: [
      "¿Cómo registras las ventas actualmente? ¿Usas algún sistema o es manual?",
      "¿Qué información necesitas ver todos los días para saber si el negocio va bien?",
      "¿Cuáles son los 3 problemas más grandes que enfrentas en tu día a día?",
      "¿Qué decisiones tomas basándote en datos y cuáles en intuición?",
      "¿Qué reportes le entregas a la dirección del club y con qué frecuencia?",
      "Si pudieras tener una herramienta mágica que te resolviera un problema, ¿cuál sería?",
    ],
  },
};
