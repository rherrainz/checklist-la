# Checklist LA

Aplicación web para la carga y revisión de **checklists de recorridas de sucursales**.  
Permite seleccionar sucursal, período y supervisor (zonal o regional), cargar puntajes ponderados, observaciones y generar un puntaje final.  

## 🚀 Demo en producción
- Web App: [https://checklist-la.vercel.app](https://checklist-la.vercel.app)  
- Repositorio: [https://github.com/rherrainz/checklist-la](https://github.com/rherrainz/checklist-la)

## 🛠️ Tecnologías
- **Frontend:** React + Vite + Tailwind CSS  
- **Backend actual:** Google Apps Script (API para guardar datos)  
- **Hosting:** Vercel (gratuito)

## 📦 Instalación y ejecución local
1. Clonar el repositorio:  
    git clone https://github.com/rherrainz/checklist-la.git  
    cd checklist-la  

2. Instalar dependencias:  
    npm install  

3. Configurar variables de entorno en un archivo `.env`:  
    VITE_API_URL=<URL de la Web App de Apps Script>  
    VITE_ENV=DEV  

4. Iniciar en modo desarrollo:  
    npm run dev  

5. Abrir en el navegador: [http://localhost:5173](http://localhost:5173)

## 📤 Deploy
El proyecto está configurado para despliegue en **Vercel**.  
Para hacer un build local:  
    npm run build  
y luego subir la carpeta `dist/` a Vercel.  

## 🔑 Autenticación (futuro)
Actualmente la app no tiene login. La propuesta de escalamiento incluye:  
- Integrar **Microsoft 365 (Azure AD / Entra ID)** para Single Sign-On corporativo.  
- Roles por perfil: Gerente Regional, Gerente Zonal, Supervisor.  

## 📈 Próximos pasos
- Migrar backend desde Google Apps Script a API propia (Node.js o Django).  
- Incorporar base de datos corporativa (PostgreSQL o SQL Server).  
- Autenticación con Microsoft 365.  
- Hosting en servidores propios o cloud (Azure/AWS/GCP).  
- Dominio corporativo: `checklist.laanonima.com.ar`.  

## 📜 Licencia
Uso interno corporativo – La Anónima.
