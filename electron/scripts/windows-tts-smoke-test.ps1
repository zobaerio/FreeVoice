$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = @($synth.GetInstalledVoices() | Where-Object { $_.Enabled })
if ($voices.Count -eq 0) {
  throw 'No enabled Windows speech voices are installed on this runner.'
}
$output = Join-Path $env:TEMP 'freevoice-offline-tts-smoke.wav'
try {
  $synth.SetOutputToWaveFile($output)
  $synth.Speak('FreeVoice local speech engine test.')
  $synth.Dispose()
  if (!(Test-Path $output) -or (Get-Item $output).Length -lt 44) {
    throw 'Windows Speech did not produce a valid WAV file.'
  }
  Write-Host ("Windows offline TTS OK. Voices detected: " + $voices.Count)
}
finally {
  if (Test-Path $output) { Remove-Item $output -Force }
}
