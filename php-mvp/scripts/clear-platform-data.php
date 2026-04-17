<?php

declare(strict_types=1);

/**
 * Executa database/scripts/clear_all_data.sql no SQLite (DB_DSN no .env).
 * Não exige Composer — só PHP com extensão pdo_sqlite.
 * Uso: php scripts/clear-platform-data.php
 */

$root = dirname(__DIR__);
$envFile = $root . '/.env';
$dsn = 'sqlite:storage/database.sqlite';

if (is_file($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            if (trim($key) === 'DB_DSN') {
                $dsn = trim($value, " \t\"'");
                break;
            }
        }
    }
}

if (!str_starts_with($dsn, 'sqlite:')) {
    fwrite(STDERR, "Este script só suporta SQLite. DB_DSN atual: {$dsn}\n");
    exit(1);
}

$sqlPath = $root . '/database/scripts/clear_all_data.sql';
if (!is_file($sqlPath)) {
    fwrite(STDERR, "Arquivo não encontrado: {$sqlPath}\n");
    exit(1);
}

$sql = file_get_contents($sqlPath);
if ($sql === false) {
    fwrite(STDERR, "Não foi possível ler {$sqlPath}\n");
    exit(1);
}

$sqlitePath = substr($dsn, 7);
if ($sqlitePath === '') {
    fwrite(STDERR, "Caminho SQLite vazio no DSN.\n");
    exit(1);
}

$absoluteSqlite = preg_match('/^[A-Za-z]:[\\\\\\/]/', $sqlitePath) === 1 || str_starts_with($sqlitePath, '/')
    ? $sqlitePath
    : $root . DIRECTORY_SEPARATOR . $sqlitePath;

if (!is_file($absoluteSqlite)) {
    fwrite(STDERR, "Banco SQLite não encontrado: {$absoluteSqlite}\n");
    fwrite(STDERR, "Crie o arquivo rodando o backend uma vez (migrações) ou ajuste DB_DSN.\n");
    exit(1);
}

$pdo = new PDO('sqlite:' . $absoluteSqlite, null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$pdo->exec($sql);

echo "OK: dados apagados (tabelas preservadas): {$absoluteSqlite}\n";
