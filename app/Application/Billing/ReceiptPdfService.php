<?php

namespace App\Application\Billing;

use App\Models\Payment;

class ReceiptPdfService
{
    public function generate(Payment $payment): string
    {
        $payment->loadMissing(['organization', 'event', 'quote.plan', 'createdBy', 'subscription']);
        $invoice = $payment->invoice()->firstOrFail();
        $money = number_format($payment->amount_minor / 100, 2, ',', ' ').' '.$payment->currency;
        $content = implode("\n", [
            '0.98 0.97 0.94 rg 0 0 595 842 re f',
            '0.12 0.10 0.09 rg 0 690 595 152 re f',
            $this->text('PLANIVO', 44, 782, 26, true, '1 0.78 0.25'),
            $this->text('RECU DE PAIEMENT', 44, 742, 12, true, '1 1 1'),
            $this->text($invoice->number, 44, 716, 10, false, '0.75 0.73 0.70'),
            $this->text('PAIEMENT CONFIRME', 390, 748, 10, true, '0.28 0.78 0.49'),
            $this->text('Montant paye', 44, 640, 11, false, '0.42 0.39 0.36'),
            $this->text($money, 44, 596, 30, true, '0.12 0.10 0.09'),
            '0.82 0.79 0.74 RG 44 566 m 551 566 l S',
            $this->text('DETAIL DE LA TRANSACTION', 44, 530, 11, true, '0.47 0.31 0.18'),
            $this->row('Pack', $payment->quote->plan->name, 492),
            $this->row('Organisation', $payment->organization?->name ?? '-', 460),
            $this->row('Evenement', $payment->event?->name ?? '-', 428),
            $this->row('Client', $payment->createdBy?->name ?? '-', 396),
            $this->row('Reference', $payment->external_reference, 364),
            $this->row('Moyen de paiement', strtoupper($payment->provider), 332),
            $this->row('Date', $payment->paid_at?->format('d/m/Y H:i') ?? '-', 300),
            '0.82 0.79 0.74 RG 44 260 m 551 260 l S',
            $this->text('Ce recu confirme l’encaissement du paiement ci-dessus.', 44, 222, 11, false, '0.28 0.26 0.24'),
            $this->text('Conservez-le comme justificatif de votre transaction Planivo.', 44, 200, 10, false, '0.42 0.39 0.36'),
            $this->text('Document genere automatiquement - aucune donnee bancaire n’est conservee.', 44, 72, 8, false, '0.50 0.47 0.44'),
        ]);

        return $this->document($content);
    }

    private function row(string $label, string $value, int $y): string
    {
        return $this->text($label, 44, $y, 10, false, '0.42 0.39 0.36')."\n"
            .$this->text($value, 220, $y, 11, true, '0.12 0.10 0.09');
    }

    private function text(
        string $value,
        int $x,
        int $y,
        int $size,
        bool $bold,
        string $color,
    ): string {
        $encoded = iconv('UTF-8', 'Windows-1252//TRANSLIT', $value) ?: $value;
        $escaped = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $encoded);

        return sprintf(
            '%s rg BT /%s %d Tf %d %d Td (%s) Tj ET',
            $color,
            $bold ? 'F2' : 'F1',
            $size,
            $x,
            $y,
            $escaped,
        );
    }

    private function document(string $content): string
    {
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
            '<< /Length '.strlen($content)." >>\nstream\n{$content}\nendstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
        ];
        $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        $offsets = [0];
        foreach ($objects as $index => $object) {
            $offsets[] = strlen($pdf);
            $number = $index + 1;
            $pdf .= "{$number} 0 obj\n{$object}\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= 'xref'."\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach (array_slice($offsets, 1) as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= 'trailer << /Size '.(count($objects) + 1).' /Root 1 0 R >>'."\n"
            ."startxref\n{$xref}\n%%EOF";

        return $pdf;
    }
}
