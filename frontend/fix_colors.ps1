$files = @(
    'src\components\Chats.jsx',
    'src\components\Contactos.jsx',
    'src\components\Metricas.jsx',
    'src\components\Perfil.jsx',
    'src\components\Tableros.jsx',
    'src\components\AgentesIA.jsx',
    'src\components\Automatizaciones.jsx',
    'src\components\GruposComunidades.jsx',
    'src\components\Tags.jsx',
    'src\components\Campanas.jsx',
    'src\components\EnviosMasivos.jsx',
    'src\components\CrearEnvioMasivo.jsx',
    'src\components\CrearMensaje.jsx',
    'src\components\CrearPlantilla.jsx',
    'src\components\CrearCampana.jsx',
    'src\components\WhalinkConfig.jsx',
    'src\components\WhalinkDetail.jsx',
    'src\components\WhalinkList.jsx',
    'src\components\AgentesEquipo.jsx',
    'src\components\Plantillas.jsx',
    'src\components\AutomationBuilder.jsx',
    'src\components\MensajesProgramados.jsx',
    'src\components\CustomFields.jsx',
    'src\components\ChatbotWidget.jsx',
    'src\components\Dashboard.jsx',
    'src\components\WhatsAppConnector.jsx'
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
        
        # Replace purple/indigo hex colors with cyan/sky equivalents
        $content = $content.Replace('#5d5fef', '#0ea5e9')
        $content = $content.Replace('#4b4ded', '#0284c7')
        $content = $content.Replace('#6366f1', '#0ea5e9')
        $content = $content.Replace('#4f46e5', '#0284c7')
        $content = $content.Replace('#8b5cf6', '#0ea5e9')
        $content = $content.Replace('#8B5CF6', '#0ea5e9')
        $content = $content.Replace('#7C3AED', '#0284c7')
        $content = $content.Replace('#312e81', '#0369a1')
        $content = $content.Replace('#4338ca', '#0284c7')
        $content = $content.Replace('#818cf8', '#38bdf8')
        $content = $content.Replace('#a5b4fc', '#7dd3fc')
        $content = $content.Replace('#c7d2fe', '#bae6fd')
        $content = $content.Replace('#eef2ff', '#f0f9ff')
        $content = $content.Replace('#e0e7ff', '#e0f2fe')
        $content = $content.Replace('#f5f3ff', '#f0f9ff')
        $content = $content.Replace('indigo-600', 'sky-600')
        $content = $content.Replace('indigo-500', 'sky-500')
        $content = $content.Replace('indigo-400', 'sky-400')
        $content = $content.Replace('indigo-300', 'sky-300')
        $content = $content.Replace('indigo-200', 'sky-200')
        $content = $content.Replace('indigo-100', 'sky-100')
        $content = $content.Replace('indigo-50', 'sky-50')
        $content = $content.Replace('shadow-indigo', 'shadow-sky')
        $content = $content.Replace('ring-indigo', 'ring-sky')
        $content = $content.Replace('border-indigo', 'border-sky')
        $content = $content.Replace('text-indigo', 'text-sky')
        $content = $content.Replace('bg-indigo', 'bg-sky')
        $content = $content.Replace('hover:bg-indigo', 'hover:bg-sky')
        $content = $content.Replace('hover:text-indigo', 'hover:text-sky')
        $content = $content.Replace('focus:ring-indigo', 'focus:ring-sky')
        $content = $content.Replace('focus:border-indigo', 'focus:border-sky')
        $content = $content.Replace('group-hover:text-indigo', 'group-hover:text-sky')
        $content = $content.Replace('selection:bg-indigo', 'selection:bg-sky')
        
        [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Updated: $file"
    } else {
        Write-Host "Not found: $file"
    }
}

Write-Host "Done!"
