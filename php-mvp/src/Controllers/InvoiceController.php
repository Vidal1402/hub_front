<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Repositories\ClientRepository;
use App\Repositories\InvoiceRepository;

final class InvoiceController
{
    public function __construct(
        private readonly InvoiceRepository $invoices,
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
            $items = $this->invoices->allByOrganizationAndClient($org, (int) $client['id']);
            Response::json(['data' => $items]);
            return;
        }

        $items = $this->invoices->allByOrganization($org);
        Response::json(['data' => $items]);
    }

    public function store(Request $request, array $context): void
    {
        $payload = $request->body;
        if (empty($payload['period']) || empty($payload['due_date']) || !isset($payload['amount'])) {
            Response::json([
                'error' => 'validation_error',
                'message' => 'period, amount e due_date são obrigatórios',
            ], 422);
        }

        $org = (int) $context['user']['organization_id'];
        $invoiceCode = trim((string) ($payload['invoice_code'] ?? ''));
        if ($invoiceCode === '') {
            $invoiceCode = 'INV-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
        }

        $clientIdRaw = $payload['client_id'] ?? null;
        $clientId = null;
        if ($clientIdRaw !== null && $clientIdRaw !== '') {
            $clientId = (int) $clientIdRaw;
            $clientRow = $this->clients->findByOrganizationAndId($org, $clientId);
            if ($clientRow === null) {
                Response::json(['error' => 'validation_error', 'message' => 'client_id inválido para esta organização'], 422);
            }
        }

        $id = $this->invoices->create([
            'invoice_code' => $invoiceCode,
            'period' => (string) $payload['period'],
            'amount' => (float) $payload['amount'],
            'due_date' => (string) $payload['due_date'],
            'status' => (string) ($payload['status'] ?? 'Pendente'),
            'method' => (string) ($payload['method'] ?? 'Pix'),
            'client_id' => $clientId,
        ], $org);

        Response::json([
            'message' => 'Fatura criada',
            'id' => $id,
            'invoice_code' => $invoiceCode,
        ], 201);
    }

    public function update(Request $request, array $params, array $context): void
    {
        $invoiceId = (int) ($params['id'] ?? 0);
        if ($invoiceId <= 0) {
            Response::json(['error' => 'validation_error', 'message' => 'id inválido'], 422);
        }

        $org = (int) $context['user']['organization_id'];
        $body = $request->body;
        if (!is_array($body)) {
            $body = [];
        }

        $patch = [];
        if (array_key_exists('status', $body)) {
            $patch['status'] = trim((string) $body['status']);
            if ($patch['status'] === '') {
                Response::json(['error' => 'validation_error', 'message' => 'status inválido'], 422);
            }
        }
        if (array_key_exists('paid_at', $body)) {
            $v = $body['paid_at'];
            $patch['paid_at'] = ($v === null || $v === '') ? null : (string) $v;
        }

        if ($patch === []) {
            Response::json(['error' => 'validation_error', 'message' => 'Informe status ou paid_at'], 422);
        }

        if (isset($patch['status']) && strcasecmp($patch['status'], 'Pago') === 0 && !array_key_exists('paid_at', $body)) {
            $patch['paid_at'] = date('Y-m-d');
        }
        if (isset($patch['status']) && strcasecmp($patch['status'], 'Pago') !== 0 && !array_key_exists('paid_at', $body)) {
            $patch['paid_at'] = null;
        }

        $updated = $this->invoices->updateForOrganization($invoiceId, $org, $patch);
        if (!$updated) {
            Response::json(['error' => 'not_found', 'message' => 'Fatura não encontrada'], 404);
        }

        Response::json(['message' => 'Cobrança atualizada']);
    }
}
