<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class InvoiceRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function allByOrganization(int $organizationId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, invoice_code, period, amount, due_date, status, method, paid_at, created_at, client_id
             FROM invoices
             WHERE organization_id = :org
             ORDER BY id DESC'
        );
        $stmt->execute(['org' => $organizationId]);
        return $stmt->fetchAll() ?: [];
    }

    public function allByOrganizationAndClient(int $organizationId, int $clientId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, invoice_code, period, amount, due_date, status, method, paid_at, created_at, client_id
             FROM invoices
             WHERE organization_id = :org AND client_id = :client_id
             ORDER BY id DESC'
        );
        $stmt->execute(['org' => $organizationId, 'client_id' => $clientId]);
        return $stmt->fetchAll() ?: [];
    }

    /**
     * @param array{invoice_code:string, period:string, amount:float, due_date:string, status:string, method:string} $payload
     */
    public function create(array $payload, int $organizationId): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO invoices (invoice_code, period, amount, due_date, status, method, organization_id, client_id)
             VALUES (:invoice_code, :period, :amount, :due_date, :status, :method, :organization_id, :client_id)'
        );
        $stmt->execute([
            'invoice_code' => $payload['invoice_code'],
            'period' => $payload['period'],
            'amount' => $payload['amount'],
            'due_date' => $payload['due_date'],
            'status' => $payload['status'],
            'method' => $payload['method'],
            'organization_id' => $organizationId,
            'client_id' => $payload['client_id'] ?? null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @param array{status?: string, paid_at?: string|null} $patch
     */
    public function updateForOrganization(int $invoiceId, int $organizationId, array $patch): bool
    {
        $allowed = ['status', 'paid_at'];
        $sets = [];
        $params = ['id' => $invoiceId, 'org' => $organizationId];
        foreach ($allowed as $k) {
            if (!array_key_exists($k, $patch)) {
                continue;
            }
            $sets[] = $k . ' = :' . $k;
            $params[$k] = $patch[$k];
        }
        if ($sets === []) {
            return false;
        }

        $sql = 'UPDATE invoices SET ' . implode(', ', $sets) . ' WHERE id = :id AND organization_id = :org';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->rowCount() > 0;
    }
}
