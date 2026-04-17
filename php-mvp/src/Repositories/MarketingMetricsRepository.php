<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class MarketingMetricsRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function findByOrgClientPeriod(int $organizationId, int $clientId, string $periodLabel): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM marketing_metrics_reports
             WHERE organization_id = :org AND client_id = :client_id AND period_label = :period
             LIMIT 1'
        );
        $stmt->execute([
            'org' => $organizationId,
            'client_id' => $clientId,
            'period' => $periodLabel,
        ]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function allByOrganizationAndClient(int $organizationId, int $clientId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM marketing_metrics_reports
             WHERE organization_id = :org AND client_id = :client_id
             ORDER BY updated_at DESC, id DESC'
        );
        $stmt->execute(['org' => $organizationId, 'client_id' => $clientId]);
        return $stmt->fetchAll() ?: [];
    }

    public function allByOrganization(int $organizationId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT m.*, c.name AS client_name, c.empresa AS client_empresa
             FROM marketing_metrics_reports m
             INNER JOIN clients c ON c.id = m.client_id AND c.organization_id = m.organization_id
             WHERE m.organization_id = :org
             ORDER BY m.updated_at DESC, m.id DESC'
        );
        $stmt->execute(['org' => $organizationId]);
        return $stmt->fetchAll() ?: [];
    }

    /**
     * @param array<string, mixed> $row
     */
    public function insert(int $organizationId, array $row): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO marketing_metrics_reports (
                organization_id, client_id, period_label,
                meta_account_id, meta_account_name, meta_spend, meta_leads, meta_conversions,
                google_account_id, google_account_name, google_spend, google_leads, google_conversions,
                organic_spend, organic_leads, organic_conversions,
                outros_spend, outros_leads, outros_conversions
            ) VALUES (
                :organization_id, :client_id, :period_label,
                :meta_account_id, :meta_account_name, :meta_spend, :meta_leads, :meta_conversions,
                :google_account_id, :google_account_name, :google_spend, :google_leads, :google_conversions,
                :organic_spend, :organic_leads, :organic_conversions,
                :outros_spend, :outros_leads, :outros_conversions
            )'
        );
        $stmt->execute(array_merge(['organization_id' => $organizationId], $row));

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * @param array<string, mixed> $row
     */
    public function updateRow(int $id, int $organizationId, array $row): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE marketing_metrics_reports SET
                meta_account_id = :meta_account_id,
                meta_account_name = :meta_account_name,
                meta_spend = :meta_spend,
                meta_leads = :meta_leads,
                meta_conversions = :meta_conversions,
                google_account_id = :google_account_id,
                google_account_name = :google_account_name,
                google_spend = :google_spend,
                google_leads = :google_leads,
                google_conversions = :google_conversions,
                organic_spend = :organic_spend,
                organic_leads = :organic_leads,
                organic_conversions = :organic_conversions,
                outros_spend = :outros_spend,
                outros_leads = :outros_leads,
                outros_conversions = :outros_conversions,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = :id AND organization_id = :org'
        );
        $stmt->execute(array_merge($row, ['id' => $id, 'org' => $organizationId]));

        return $stmt->rowCount() > 0;
    }
}
