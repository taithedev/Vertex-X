@echo off
setlocal
cd /d "%~dp0"
echo This builds Vertex X, then publishes the installer to your GitHub Releases.
echo You must be signed in to GitHub CLI as a maintainer of taithedev/Vertex-X.
call "%~dp0Build-VertexX.cmd" publish
exit /b %ERRORLEVEL%
