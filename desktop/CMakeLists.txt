cmake_minimum_required(VERSION 3.16)
project(OncoInfo VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# Find Qt6 components
find_package(Qt6 REQUIRED COMPONENTS
    Core
    Widgets
    Sql
    Network
    PrintSupport
    LinguistTools
)

# Platform-specific libraries
if(WIN32)
    set(PLATFORM_LIBS Secur32 Advapi32 Netapi32 Wldap32)
else()
    set(PLATFORM_LIBS "")
endif()

# Source files
set(SOURCES
    src/main.cpp

    # Models
    src/models/Drug.h
    src/models/User.h
    src/models/Hospital.h

    # Core
    src/core/Database.h
    src/core/Database.cpp
    src/core/DrugRepository.h
    src/core/DrugRepository.cpp
    src/core/UserRepository.h
    src/core/UserRepository.cpp
    src/core/FavoritesRepository.h
    src/core/FavoritesRepository.cpp
    src/core/SettingsManager.h
    src/core/SettingsManager.cpp
    src/core/AuditLogger.h
    src/core/AuditLogger.cpp

    # Auth
    src/auth/AuthManager.h
    src/auth/AuthManager.cpp
    src/auth/WindowsAuth.h
    src/auth/WindowsAuth.cpp

    # i18n
    src/i18n/TranslationManager.h
    src/i18n/TranslationManager.cpp

    # UI
    src/ui/StyleSheet.h
    src/ui/StyleSheet.cpp
    src/ui/LoginDialog.h
    src/ui/LoginDialog.cpp
    src/ui/MainWindow.h
    src/ui/MainWindow.cpp
    src/ui/HomePage.h
    src/ui/HomePage.cpp
    src/ui/DrugsPage.h
    src/ui/DrugsPage.cpp
    src/ui/DrugDetailWidget.h
    src/ui/DrugDetailWidget.cpp
    src/ui/SearchBar.h
    src/ui/SearchBar.cpp
    src/ui/FavoritesPanel.h
    src/ui/FavoritesPanel.cpp
    src/ui/AdminPanel.h
    src/ui/AdminPanel.cpp
    src/ui/PatientFolderDialog.h
    src/ui/PatientFolderDialog.cpp

    # Network
    src/network/NetworkManager.h
    src/network/NetworkManager.cpp
    src/network/SyncService.h
    src/network/SyncService.cpp
)

# Qt Resource file
set(RESOURCES resources/oncoinfo.qrc)

# Create executable
add_executable(OncoInfo WIN32 ${SOURCES} ${RESOURCES})

# Include directories
target_include_directories(OncoInfo PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Link libraries
target_link_libraries(OncoInfo PRIVATE
    Qt6::Core
    Qt6::Widgets
    Qt6::Sql
    Qt6::Network
    Qt6::PrintSupport
    ${PLATFORM_LIBS}
)

# Copy translation files to build directory
file(GLOB TRANSLATION_FILES "${CMAKE_CURRENT_SOURCE_DIR}/resources/translations/*.json")
foreach(TRANS_FILE ${TRANSLATION_FILES})
    get_filename_component(TRANS_NAME ${TRANS_FILE} NAME)
    configure_file(${TRANS_FILE} ${CMAKE_BINARY_DIR}/translations/${TRANS_NAME} COPYONLY)
endforeach()

# Installation rules
install(TARGETS OncoInfo RUNTIME DESTINATION bin)
install(DIRECTORY resources/translations DESTINATION share/oncoinfo)
install(DIRECTORY resources/icons DESTINATION share/oncoinfo)

# Windows-specific: embed application icon and version info
if(WIN32)
    target_sources(OncoInfo PRIVATE resources/oncoinfo.rc)
    set_target_properties(OncoInfo PROPERTIES
        WIN32_EXECUTABLE TRUE
        VS_DPI_AWARE "PerMonitor"
    )
endif()

# CPack for creating installer packages
set(CPACK_PACKAGE_NAME "OncoInfo")
set(CPACK_PACKAGE_VENDOR "DRMSoftware")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Oncology Drug Information Library")
set(CPACK_PACKAGE_VERSION_MAJOR ${PROJECT_VERSION_MAJOR})
set(CPACK_PACKAGE_VERSION_MINOR ${PROJECT_VERSION_MINOR})
set(CPACK_PACKAGE_VERSION_PATCH ${PROJECT_VERSION_PATCH})
set(CPACK_RESOURCE_FILE_LICENSE "${CMAKE_CURRENT_SOURCE_DIR}/LICENSE.txt")

if(WIN32)
    set(CPACK_GENERATOR "NSIS")
    set(CPACK_NSIS_DISPLAY_NAME "OncoInfo - Medicijnbibliotheek")
    set(CPACK_NSIS_PACKAGE_NAME "OncoInfo")
    set(CPACK_NSIS_MUI_ICON "${CMAKE_CURRENT_SOURCE_DIR}/resources/icons/oncoinfo.ico")
endif()

include(CPack)
