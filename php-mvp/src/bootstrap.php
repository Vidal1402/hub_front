<?php

declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\ClientController;
use App\Controllers\ClientReportController;
use App\Controllers\HealthController;
use App\Controllers\InvoiceController;
use App\Controllers\MarketingMetricsController;
use App\Controllers\TaskController;
use App\Core\Database;
use App\Core\Env;
use App\Core\Migrator;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Middleware\AuthMiddleware;
use App\Repositories\ClientRepository;
use App\Repositories\ClientReportRepository;
use App\Repositories\InvoiceRepository;
use App\Repositories\MarketingMetricsRepository;
use App\Repositories\TaskRepository;
use App\Repositories\UserRepository;

Env::load(dirname(__DIR__) . '/.env');

$pdo = Database::connection();
Migrator::run($pdo, dirname(__DIR__) . '/database/migrations');

$users = new UserRepository($pdo);
$clients = new ClientRepository($pdo);
$tasks = new TaskRepository($pdo);
$invoices = new InvoiceRepository($pdo);
$clientReports = new ClientReportRepository($pdo);
$marketingMetrics = new MarketingMetricsRepository($pdo);

$authController = new AuthController($users);
$clientController = new ClientController($clients);
$taskController = new TaskController($tasks);
$invoiceController = new InvoiceController($invoices, $clients);
$clientReportController = new ClientReportController($clientReports, $clients);
$marketingMetricsController = new MarketingMetricsController($marketingMetrics, $clients);
$healthController = new HealthController();

$authMiddleware = new AuthMiddleware($users);
$adminOnly = function (Request $request, array $params, array $context): array {
    $role = $context['user']['role'] ?? '';
    if ($role !== 'admin') {
        Response::json(['error' => 'forbidden', 'message' => 'Acesso restrito para admin'], 403);
    }
    return [];
};

$clienteOnly = function (Request $request, array $params, array $context): array {
    $role = $context['user']['role'] ?? '';
    if ($role !== 'cliente') {
        Response::json(['error' => 'forbidden', 'message' => 'Apenas clientes podem abrir solicitações de produção'], 403);
    }
    return [];
};

/** Admin e colaboradores podem mover/editar tarefas; gestor só visualiza (área admin em leitura). */
$taskMutationAllowed = function (Request $request, array $params, array $context): array {
    $role = (string) ($context['user']['role'] ?? '');
    if (!in_array($role, ['admin', 'colaborador'], true)) {
        Response::json(['error' => 'forbidden', 'message' => 'Apenas admin ou colaborador podem alterar tarefas'], 403);
    }
    return [];
};

$router = new Router();

$router->add('GET', '/api/health', fn(Request $request) => $healthController($request));

$router->add('POST', '/api/auth/register', fn(Request $request) => $authController->register($request));
$router->add('POST', '/api/auth/login', fn(Request $request) => $authController->login($request));
$router->add('GET', '/api/auth/me', fn(Request $request, array $params, array $context) => $authController->me($context), [$authMiddleware]);
$router->add('POST', '/api/admin/users', fn(Request $request, array $params, array $context) => $authController->adminCreateUser($request, $context), [$authMiddleware, $adminOnly]);

$router->add('GET', '/api/clients', fn(Request $request, array $params, array $context) => $clientController->index($context), [$authMiddleware]);
$router->add('GET', '/api/clients/me', fn(Request $request, array $params, array $context) => $clientController->meForPortal($context), [$authMiddleware]);
$router->add('GET', '/api/clients/{id}', fn(Request $request, array $params, array $context) => $clientController->show($params, $context), [$authMiddleware]);
$router->add('POST', '/api/clients', fn(Request $request, array $params, array $context) => $clientController->store($request, $context), [$authMiddleware, $adminOnly]);
$router->add('PATCH', '/api/clients/{id}', fn(Request $request, array $params, array $context) => $clientController->update($request, $params, $context), [$authMiddleware, $adminOnly]);
$router->add('DELETE', '/api/clients/{id}', fn(Request $request, array $params, array $context) => $clientController->destroy($params, $context), [$authMiddleware, $adminOnly]);

$router->add('GET', '/api/tasks', fn(Request $request, array $params, array $context) => $taskController->index($context), [$authMiddleware]);
$router->add('POST', '/api/tasks', fn(Request $request, array $params, array $context) => $taskController->store($request, $context), [$authMiddleware, $clienteOnly]);
$router->add('PATCH', '/api/tasks/{id}', fn(Request $request, array $params, array $context) => $taskController->update($request, $params, $context), [$authMiddleware, $taskMutationAllowed]);
$router->add('PATCH', '/api/tasks/{id}/status', fn(Request $request, array $params, array $context) => $taskController->updateStatus($request, $params, $context), [$authMiddleware, $taskMutationAllowed]);

$router->add('GET', '/api/invoices', fn(Request $request, array $params, array $context) => $invoiceController->index($context), [$authMiddleware]);
$router->add('POST', '/api/invoices', fn(Request $request, array $params, array $context) => $invoiceController->store($request, $context), [$authMiddleware, $adminOnly]);
$router->add('PATCH', '/api/invoices/{id}', fn(Request $request, array $params, array $context) => $invoiceController->update($request, $params, $context), [$authMiddleware, $adminOnly]);

$router->add('GET', '/api/client-reports', fn(Request $request, array $params, array $context) => $clientReportController->index($context), [$authMiddleware]);
$router->add('POST', '/api/client-reports', fn(Request $request, array $params, array $context) => $clientReportController->store($request, $context), [$authMiddleware, $adminOnly]);
$router->add('PATCH', '/api/client-reports/{id}', fn(Request $request, array $params, array $context) => $clientReportController->update($request, $params, $context), [$authMiddleware, $adminOnly]);
$router->add('DELETE', '/api/client-reports/{id}', fn(Request $request, array $params, array $context) => $clientReportController->destroy($params, $context), [$authMiddleware, $adminOnly]);

$router->add('GET', '/api/marketing-metrics', fn(Request $request, array $params, array $context) => $marketingMetricsController->index($request, $context), [$authMiddleware]);
$router->add('POST', '/api/marketing-metrics', fn(Request $request, array $params, array $context) => $marketingMetricsController->upsert($request, $context), [$authMiddleware, $adminOnly]);

return $router;
