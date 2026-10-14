Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\xampp\htdocs\pos sys\server"
WshShell.Run "cmd.exe /c npm run dev", 0, False
