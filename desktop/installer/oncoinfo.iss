; OncoInfo - Inno Setup Installer Script
; Builds a Windows installer for the standalone desktop application

[Setup]
AppName=OncoInfo - Medicijnbibliotheek
AppVersion=1.0.0
AppPublisher=DRMSoftware
AppPublisherURL=https://drmsoftware.com
DefaultDirName={autopf}\OncoInfo
DefaultGroupName=OncoInfo
OutputBaseFilename=OncoInfo-Setup-1.0.0
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
SetupIconFile=..\resources\icons\oncoinfo.ico
UninstallDisplayIcon={app}\OncoInfo.exe
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

; Allow install without admin rights (important for hospital PCs)
; Users can install in their own AppData
[Files]
; Main executable
Source: "..\build\Release\OncoInfo.exe"; DestDir: "{app}"; Flags: ignoreversion

; Qt6 DLLs (from Qt installation's bin directory)
Source: "..\build\Release\Qt6Core.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\build\Release\Qt6Gui.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\build\Release\Qt6Widgets.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\build\Release\Qt6Sql.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\build\Release\Qt6Network.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\build\Release\Qt6PrintSupport.dll"; DestDir: "{app}"; Flags: ignoreversion

; Qt6 platform plugin
Source: "..\build\Release\platforms\qwindows.dll"; DestDir: "{app}\platforms"; Flags: ignoreversion

; Qt6 SQL driver
Source: "..\build\Release\sqldrivers\qsqlite.dll"; DestDir: "{app}\sqldrivers"; Flags: ignoreversion

; Qt6 styles
Source: "..\build\Release\styles\qmodernwindowsstyle.dll"; DestDir: "{app}\styles"; Flags: ignoreversion skipifsourcedoesntexist

; Translation files
Source: "..\resources\translations\*.json"; DestDir: "{app}\translations"; Flags: ignoreversion

; MSVC runtime (if not using static Qt)
; Source: "vcredist_x64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Icons]
Name: "{group}\OncoInfo"; Filename: "{app}\OncoInfo.exe"
Name: "{group}\Uninstall OncoInfo"; Filename: "{uninstallexe}"
Name: "{autodesktop}\OncoInfo"; Filename: "{app}\OncoInfo.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked

[Run]
; Optional: install VC++ runtime if needed
; Filename: "{tmp}\vcredist_x64.exe"; Parameters: "/install /quiet /norestart"; StatusMsg: "Installing Visual C++ Runtime..."; Flags: waituntilterminated skipifdoesntexist
Filename: "{app}\OncoInfo.exe"; Description: "Launch OncoInfo"; Flags: nowait postinstall skipifsilent

[Registry]
; Register file association for .oncoinfo files (optional data import)
Root: HKCU; Subkey: "Software\DRMSoftware\OncoInfo"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"

[Code]
// Check if Qt runtime is available
function InitializeSetup(): Boolean;
begin
  Result := True;
end;
