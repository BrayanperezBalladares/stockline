# Demo técnica de Stockline (10 minutos)

Esta guía permite demostrar autenticación, autorización RBAC, persistencia con Supabase y Clean Architecture sin improvisar ni recorrer archivos sin propósito. La secuencia es: **problema → decisiones → evidencia → límites**.

## Preparación rápida

1. Levantar la API y la aplicación web en dos terminales:

   ```powershell
   npm run dev:api
   npm run dev:web
   ```

2. Ejecutar la evidencia automatizada en una tercera terminal. Las contraseñas se solicitan de forma segura:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\demo-check.ps1 `
     -AdminEmail "admin@stockline.test" `
     -MemberEmail "member@stockline.test"
   ```

3. Abrir y dejar preparados:
   - `http://localhost:5173`
   - `http://localhost:3000/api/health`
   - `docs/architecture.md`
   - Supabase, en la vista de tablas o migraciones
4. Ocultar archivos `.env`, tokens, contraseñas y cadenas de conexión. Desactivar notificaciones.

> El script no modifica usuarios, roles, productos, ubicaciones ni cantidades. Sí crea sesiones temporales y revoca las sesiones del usuario miembro al comprobar el logout.

## Guion cronometrado

| Tiempo | Acción | Mensaje exacto sugerido |
|---|---|---|
| 0:00–0:45 | Presentar el problema | “Stockline administra productos, ubicaciones y la cantidad disponible de cada producto en cada ubicación.” |
| 0:45–1:30 | Explicar el modelo | “Producto y ubicación tienen una relación de muchos a muchos. `InventoryBalance` es una entidad explícita porque la cantidad pertenece a esa relación. La base garantiza una sola combinación por producto y ubicación y no permite cantidades negativas.” |
| 1:30–2:30 | Mostrar `docs/architecture.md` | “No llamamos Clean Architecture a tener carpetas separadas. La evidencia es la dirección de dependencias: dominio y aplicación no conocen NestJS, Prisma, React ni Supabase; infraestructura implementa los puertos definidos hacia adentro.” |
| 2:30–3:30 | Explicar autenticación | “El access token JWT dura aproximadamente una hora. El refresh token es opaco, se persiste únicamente como hash SHA-256, rota al usarlo y puede revocarse. Esto limita el impacto de una filtración.” |
| 3:30–4:15 | Explicar RBAC | “El guard autentica primero y el guard de roles autoriza después. Sin identidad válida respondemos `401`; con identidad válida pero permisos insuficientes respondemos `403`.” |
| 4:15–5:45 | Iniciar sesión como Admin | Mostrar `/users/me`, la lista de usuarios y ambos roles. Recargar la página para demostrar restauración de sesión. |
| 5:45–6:45 | Mostrar inventario real | Abrir inventario y señalar producto, ubicación y cantidad. Ajustar una cantidad sólo si se acordó previamente revertirla al valor original. |
| 6:45–7:45 | Iniciar sesión como miembro | Mostrar que puede consultar inventario, pero no ve administración de usuarios ni controles de ajuste. |
| 7:45–8:30 | Mostrar evidencia automática | Enseñar el resumen de `demo-check.ps1`: health, `/users/me`, `401`, `403`, consulta relacionada, rotación y revocación. No volver a escribir comandos largos en vivo. |
| 8:30–9:15 | Mostrar persistencia | “Prisma implementa los repositorios de infraestructura y las migraciones versionan el esquema aplicado en PostgreSQL de Supabase. React nunca accede directamente a la base.” |
| 9:15–10:00 | Pruebas, límites y cierre | “La solución integra autenticación, RBAC y persistencia sin acoplar las reglas de negocio a los frameworks. Para producción moveríamos el refresh token a una cookie `HttpOnly`, añadiríamos rate limiting, observabilidad y una suite HTTP end-to-end permanente.” |

## Recorrido visual

Seguir este orden y evitar abrir código salvo que el evaluador lo solicite:

1. Login de administrador.
2. Recarga de página con sesión conservada.
3. Vista de usuarios y roles `ADMIN` / `SUBSCRIPTION_L1`.
4. Inventario con producto, ubicación y cantidad.
5. Logout del administrador.
6. Login del miembro.
7. Inventario disponible y controles administrativos ausentes.
8. Terminal con el resumen automatizado.
9. Diagrama de arquitectura y migración de Prisma.

## Evidencia que debe quedar visible

- [ ] `GET /api/health` responde `200` y `{ "status": "ok" }`.
- [ ] Login de Admin y miembro devuelve access y refresh tokens.
- [ ] `GET /api/users/me` identifica correctamente cada rol.
- [ ] Sin token, `/api/users/me` responde `401`.
- [ ] Un miembro autenticado no puede listar usuarios: `403`.
- [ ] `/api/inventory` devuelve una consulta relacionada con producto, ubicación y cantidad.
- [ ] El refresh entrega un token nuevo y rechaza el anterior.
- [ ] El logout invalida el refresh token vigente.
- [ ] La interfaz consume la API real y conserva la sesión al recargar.
- [ ] Las migraciones de Prisma están aplicadas en Supabase.
- [ ] `.env` no está versionado y no se muestran secretos.
- [ ] `npm test` y `npm run build` terminan correctamente.

## Preguntas probables y respuestas breves

### ¿Por qué NestJS entre React y Supabase?

NestJS es la frontera de seguridad y reglas de negocio. Si React accediera directamente a la base, la autorización y los casos de uso quedarían distribuidos en el cliente o dependerían totalmente de reglas externas.

### ¿Por qué JWT y además sesiones de refresh?

El access token permite validar solicitudes sin consultar una sesión en cada operación. La sesión de refresh aporta rotación y revocación. Se acepta esa pequeña persistencia para poder cerrar sesiones de forma controlada.

### ¿Por qué guardar el refresh token como hash?

Si la tabla de sesiones se filtra, el valor persistido no sirve directamente para renovar una sesión. El servidor compara el hash del token presentado.

### ¿Cuál es la diferencia entre `401` y `403`?

`401` indica que no existe una identidad válida, por ejemplo token inválido o usuario inactivo. `403` indica que sí hay identidad, pero falta el rol requerido o la suscripción está vencida.

### ¿Qué hace que esto sea Clean Architecture?

La regla de dependencias. Los casos de uso dependen de abstracciones y el dominio no importa NestJS ni Prisma. Los controladores y repositorios son adaptadores reemplazables.

### ¿Esto implementa CQRS completo?

No. Separamos conceptualmente comandos y consultas, pero no incorporamos buses, proyecciones ni almacenamiento separado porque no aportarían valor proporcional al alcance.

### ¿Por qué `InventoryBalance` no es sólo una tabla intermedia?

Porque contiene un concepto del negocio: la cantidad disponible. Además tiene identidad, fecha de actualización e invariantes como cantidad no negativa y unicidad producto–ubicación.

### ¿Cómo protegen al sistema de quedarse sin administradores?

La aplicación impide que un administrador se desactive a sí mismo y que se desactive al último administrador activo. Tampoco existe un endpoint para cambiar roles arbitrariamente.

### ¿Qué mejorarían antes de producción?

Guardar el refresh token en una cookie `Secure`, `HttpOnly` y `SameSite`; añadir rate limiting, recuperación de contraseña, auditoría, observabilidad y pruebas HTTP end-to-end automatizadas.

## Plan de contingencia

| Falla | Respuesta |
|---|---|
| La API no inicia | Mostrar la terminal, comprobar `.env` sin exponerlo y usar la evidencia del último ensayo. No depurar durante más de 20 segundos. |
| El frontend no carga | Demostrar los mismos flujos con `demo-check.ps1` y continuar con arquitectura y Supabase. |
| Supabase no responde | Explicar que es una dependencia remota, mostrar las migraciones versionadas y los resultados previos del script. |
| Una credencial falla | Confirmar correo y estado del usuario en Supabase sin revelar contraseñas; continuar con la otra cuenta. |
| Se pierde tiempo | Omitir navegación por código. Conservar modelo, arquitectura, RBAC, evidencia y cierre. |

No inventar resultados ni esconder una falla. Explicar qué capa falló, qué evidencia existe y cómo se diagnosticaría después de la presentación.

## Ensayo final

- [ ] Realizar un ensayo completo y terminar antes de 9 minutos.
- [ ] Realizar un segundo ensayo simulando una falla de red.
- [ ] Asignar una persona para hablar, otra para conducir y otra para responder preguntas, si el equipo lo permite.
- [ ] Todos pueden explicar la dirección de dependencias sin leer.
- [ ] Todos pueden justificar `401` frente a `403`.
- [ ] Todos pueden explicar la rotación y revocación del refresh token.
- [ ] Todos pueden explicar por qué `InventoryBalance` es una entidad del dominio.
- [ ] Las credenciales de demostración están disponibles sin mostrarlas en pantalla.
- [ ] El script termina con todos los controles en `PASS`.
- [ ] Existe evidencia de `npm test` y `npm run build`.

## Cierre recomendado

> “Stockline demuestra autenticación, autorización por roles y persistencia relacional real. La arquitectura mantiene las reglas de negocio independientes de NestJS, Prisma, React y Supabase, y los flujos críticos están respaldados por evidencia ejecutable.”
