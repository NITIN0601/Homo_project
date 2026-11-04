import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { cn } from "../utils/cn";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Input,
  Textarea,
  Select,
  Modal,
  Tabs,
  Heading,
  Text,
  Caption,
  MicroLabel,
} from "../components/ui";

describe("Phase 1: Enterprise UI Primitives & Design Tokens", () => {
  describe("cn Utility (Class Merging & Deduplication)", () => {
    it("merges simple string classes and filters falsy values", () => {
      const result = cn("btn", false && "hidden", null, undefined, "btn-primary");
      expect(result).toBe("btn btn-primary");
    });

    it("evaluates object condition flags correctly", () => {
      const result = cn("base", { active: true, disabled: false });
      expect(result).toBe("base active");
    });

    it("deduplicates conflicting Tailwind background colors", () => {
      const result = cn("bg-emerald-700", "bg-purple-800");
      expect(result).toBe("bg-purple-800");
    });

    it("deduplicates conflicting padding classes", () => {
      const result = cn("p-4", "p-6");
      expect(result).toBe("p-6");
    });
  });

  describe("Button Component", () => {
    it("renders with default primary variant and emerald background", () => {
      const html = renderToString(<Button>Book Appointment</Button>);
      expect(html).toContain("Book Appointment");
      expect(html).toContain("bg-emerald-700");
      expect(html).toContain("min-h-[44px]");
    });

    it("renders secondary, outline, and danger variants properly", () => {
      const secHtml = renderToString(<Button variant="secondary">Cancel</Button>);
      expect(secHtml).toContain("bg-stone-100");

      const outlineHtml = renderToString(<Button variant="outline">View Records</Button>);
      expect(outlineHtml).toContain("border-stone-300");

      const dangerHtml = renderToString(<Button variant="danger">Delete Record</Button>);
      expect(dangerHtml).toContain("bg-rose-600");
    });

    it("disables button and renders spinner when isLoading is true", () => {
      const html = renderToString(<Button isLoading>Saving...</Button>);
      expect(html).toContain("disabled");
      expect(html).toContain("animate-spin");
    });
  });

  describe("Badge Component", () => {
    it("renders semantic success, warning, and pulse dot badges", () => {
      const successHtml = renderToString(<Badge variant="success">Confirmed</Badge>);
      expect(successHtml).toContain("Confirmed");
      expect(successHtml).toContain("bg-emerald-50");

      const warningHtml = renderToString(<Badge variant="warning" dot pulse>Pending Review</Badge>);
      expect(warningHtml).toContain("Pending Review");
      expect(warningHtml).toContain("bg-amber-50");
      expect(warningHtml).toContain("animate-pulse");
    });
  });

  describe("Card Component", () => {
    it("renders card with header, title, content and footer", () => {
      const html = renderToString(
        <Card variant="default">
          <CardHeader>
            <CardTitle>Medical Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Patient is recovering well.</p>
          </CardContent>
          <CardFooter>
            <span>Verified</span>
          </CardFooter>
        </Card>
      );
      expect(html).toContain("Medical Summary");
      expect(html).toContain("Patient is recovering well.");
      expect(html).toContain("Verified");
      expect(html).toContain("card-shadow");
    });

    it("renders dark gradient card variant properly", () => {
      const darkHtml = renderToString(<Card variant="dark">Dark Card</Card>);
      expect(darkHtml).toContain("from-stone-900");
      expect(darkHtml).toContain("to-emerald-950");
    });
  });

  describe("Input and Form Controls", () => {
    it("renders input with label, helper text, and iOS 16px font-size protection", () => {
      const html = renderToString(
        <Input
          label="Patient Full Name"
          placeholder="e.g. John Doe"
          helperText="As printed on government ID"
        />
      );
      expect(html).toContain("Patient Full Name");
      expect(html).toContain("As printed on government ID");
      expect(html).toContain("text-[16px]");
    });

    it("displays error message and applies rose border on error", () => {
      const html = renderToString(
        <Input
          label="Phone Number"
          errorMessage="Valid 10-digit mobile number required"
        />
      );
      expect(html).toContain("Valid 10-digit mobile number required");
      expect(html).toContain("border-rose-400");
    });

    it("renders textarea and select components cleanly", () => {
      const textareaHtml = renderToString(<Textarea label="Clinical Notes" rows={5} />);
      expect(textareaHtml).toContain("Clinical Notes");
      expect(textareaHtml).toContain("<textarea");

      const selectHtml = renderToString(
        <Select label="Gender" options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }]} />
      );
      expect(selectHtml).toContain("Gender");
      expect(selectHtml).toContain("Male");
      expect(selectHtml).toContain("Female");
    });
  });

  describe("Modal Component", () => {
    it("renders modal dialog markup when isOpen is true", () => {
      const html = renderToString(
        <Modal isOpen={true} onClose={() => {}} title="Prescription Details">
          <p>Prescription form content</p>
        </Modal>
      );
      expect(html).toContain("Prescription Details");
      expect(html).toContain("Prescription form content");
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
    });

    it("returns null when isOpen is false", () => {
      const html = renderToString(
        <Modal isOpen={false} onClose={() => {}} title="Hidden Modal">
          <p>Should not be seen</p>
        </Modal>
      );
      expect(html).toBe("");
    });
  });

  describe("Tabs Component", () => {
    it("renders tab options with accessibility attributes", () => {
      const tabs = [
        { id: "records", label: "Medical Records" },
        { id: "payments", label: "Billing & Invoices" },
      ];
      const html = renderToString(<Tabs tabs={tabs} activeTab="records" onTabChange={() => {}} />);
      expect(html).toContain('role="tablist"');
      expect(html).toContain('aria-selected="true"');
      expect(html).toContain("Medical Records");
      expect(html).toContain("Billing &amp; Invoices");
    });
  });

  describe("Typography Components", () => {
    it("renders headings, captions, and micro-labels cleanly", () => {
      const html = renderToString(
        <div>
          <Heading level={1}>Clinical Portal</Heading>
          <Text variant="muted">Patient portal for Agastya Clinic</Text>
          <Caption>Last updated 2 hours ago</Caption>
          <MicroLabel>MRN-4892</MicroLabel>
        </div>
      );
      expect(html).toContain("Clinical Portal");
      expect(html).toContain("Patient portal for Agastya Clinic");
      expect(html).toContain("Last updated 2 hours ago");
      expect(html).toContain("MRN-4892");
    });
  });
});
