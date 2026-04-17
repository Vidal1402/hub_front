<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Repositories\ClientReportRepository;
use App\Repositories\ClientRepository;

final class ClientReportController
{
    public function __construct(
        private readonly ClientReportRepository $reports,
        private readonly ClientRepository $clients,
    ) {
    }

    public function index(array $context): void
    {
        $org = (int) $context['user']['organization_id'];
        $role = (string) ($context['user']['role'] ?? '');

        if ($role === 'cliente') {
            $uid = (int) ($context['user']['id'] ?? 0);
            $email = (string) ($context['user']['email'] ?? '');
            $client = $this->clients->findByUserId($uid)
                ?? $this->clients->findByOrganizationAndEmail($org, $email);
            if ($client === null) {
                Response::json(['data' => []]);
                return;
            }
            $items = $this->reports->allByOrganizationAndClient($org, (int) $client['id']);
            Response::json(['data' => $items]);
            return;
        }

        $items = $this->reports->allByOrganization($org);
        Response::json(['data' => $items]);
    }

    public function store(Request $request, array $context): void
    {
        $payload = $request->body;
        $title = trim((string) ($payload['title'] ?? ''));
        $url = trim((string) ($payload['url'] ?? ''));
        $clientId = (int) ($payload['client_id'] ?? 0);

        if ($title === '' || $url === '' || $clientId <= 0) {
            Response::json(['error' => 'validation_error', 'message' => 'title, url e client_id são obrigatórios'], 422);
        }

        $org = (int) $context['user']['organization_id'];
        $client = $this->clients->findByOrganizationAndId($org, $clientId);
        if ($client === null) {
            Response::json(['error' => 'validation_error', 'message' => 'client_id inválido'], 422);
        }

        $description = $payload['description'] ?? null;
        if (is_string($description) && trim($description) === '') {
            $description = null;
        } elseif (is_string($description)) {
            $description = trim($description);
        }

        $periodLabel = $payload['period_label'] ?? null;
        if (is_string($periodLabel) && trim($periodLabel) === '') {
            $periodLabel = null;
        } elseif (is_string($periodLabel)) {
            $periodLabel = trim($periodLabel);
        }

        $id = $this->reports->create([
            'client_id' => $clientId,
            'title' => $title,
            'description' => $description,
            'url' => $url,
            'period_label' => $periodLabel,
        ], $org);
        Response::json(['message' => 'Relatório publicado', 'id' => $id], 201);
    }

    public function update(Request $request, array $params, array $context): void
    {
        $id = (int) ($params['id'] ?? 0);
        if ($id <= 0) {
            Response::json(['error' => 'validation_error', 'message' => 'id inválido'], 422);
        }

        $org = (int) $context['user']['organization_id'];
        $body = $request->body;
        if (!is_array($body)) {
            $body = [];
        }

        $patch = [];
        foreach (['title', 'description', 'url', 'period_label'] as $key) {
            if (!array_key_exists($key, $body)) {
                continue;
            }
            if ($key === 'url') {
                $patch['url'] = trim((string) $body[$key]);
                continue;
            }
            if ($key === 'description' && ($body[$key] === '' || $body[$key] === null)) {
                $patch['description'] = null;
                continue;
            }
            $patch[$key] = $body[$key];
        }

        if ($patch === []) {
            Response::json(['error' => 'validation_error', 'message' => 'Nenhum campo para atualizar'], 422);
        }

        if (isset($patch['title']) && trim((string) $patch['title']) === '') {
            Response::json(['error' => 'validation_error', 'message' => 'title não pode ser vazio'], 422);
        }
        if (isset($patch['url']) && $patch['url'] === '') {
            Response::json(['error' => 'validation_error', 'message' => 'url não pode ser vazio'], 422);
        }

        $ok = $this->reports->update($org, $id, $patch);
        if (!$ok) {
            Response::json(['error' => 'not_found', 'message' => 'Relatório não encontrado'], 404);
        }

        Response::json(['message' => 'Relatório atualizado']);
    }

    public function destroy(array $params, array $context): void
    {
        $id = (int) ($params['id'] ?? 0);
        if ($id <= 0) {
            Response::json(['error' => 'validation_error', 'message' => 'id inválido'], 422);
        }

        $org = (int) $context['user']['organization_id'];
        $ok = $this->reports->deleteForOrganization($org, $id);
        if (!$ok) {
            Response::json(['error' => 'not_found', 'message' => 'Relatório não encontrado'], 404);
        }

        Response::json(['message' => 'Relatório removido']);
    }
}
