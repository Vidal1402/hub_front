<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class ClientReportRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function allByOrganization(int $organizationId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT r.id, r.organization_id, r.client_id, r.title, r.description, r.url, r.period_label, r.created_at, r.updated_at,
                    c.name AS client_name, c.empresa AS client_empresa
             FROM client_reports r
             INNER JOIN clients c ON c.id = r.client_id AND c.organization_id = r.organization_id
             WHERE r.organization_id = :org
             ORDER BY r.id DESC'
        );
        $stmt->execute(['org' => $organizationId]);
        return $stmt->fetchAll() ?: [];
    }

    public function allByOrganizationAndClient(int $organizationId, int $clientId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, organization_id, client_id, title, description, url, period_label, created_at, updated_at
             FROM client_reports
             WHERE organization_id = :org AND client_id = :client_id
             ORDER BY id DESC'
        );
        $stmt->execute(['org' => $organizationId, 'client_id' => $clientId]);
        return $stmt->fetchAll() ?: [];
    }

    public function findByOrganizationAndId(int $organizationId, int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM client_reports WHERE organization_id = :org AND id = :id LIMIT 1'
        );
        $stmt->execute(['org' => $organizationId, 'id' => $id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function create(array $payload, int $organizationId): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO client_reports (organization_id, client_id, title, description, url, period_label)
             VALUES (:organization_id, :client_id, :title, :description, :url, :period_label)'
        );
        $stmt->execute([
            'organization_id' => $organizationId,
            'client_id' => (int) $payload['client_id'],
            'title' => (string) $payload['title'],
            'description' => isset($payload['description']) ? (string) $payload['description'] : null,
            'url' => trim((string) $payload['url']),
            'period_label' => isset($payload['period_label']) ? (string) $payload['period_label'] : null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $organizationId, int $id, array $patch): bool
    {
        $current = $this->findByOrganizationAndId($organizationId, $id);
        if ($current === null) {
            return false;
        }

        $merged = array_merge($current, $patch);
        $stmt = $this->pdo->prepare(
            'UPDATE client_reports
             SET title = :title, description = :description, url = :url, period_label = :period_label, updated_at = CURRENT_TIMESTAMP
             WHERE organization_id = :org AND id = :id'
        );
        $stmt->execute([
            'title' => $merged['title'],
            'description' => $merged['description'] ?? null,
            'url' => trim((string) ($merged['url'] ?? '')),
            'period_label' => $merged['period_label'] ?? null,
            'org' => $organizationId,
            'id' => $id,
        ]);

        return $stmt->rowCount() > 0;
    }

    public function deleteForOrganization(int $organizationId, int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM client_reports WHERE organization_id = :org AND id = :id');
        $stmt->execute(['org' => $organizationId, 'id' => $id]);

        return $stmt->rowCount() > 0;
    }
}
