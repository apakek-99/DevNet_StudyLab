import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DomainCard, type DomainData } from "@/components/dashboard/domain-card";

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock lucide-react icons as simple spans with data-testid
vi.mock("lucide-react", () => ({
  BookOpen: (props: Record<string, unknown>) => (
    <span data-testid="icon-book-open" {...props} />
  ),
  Layers: (props: Record<string, unknown>) => (
    <span data-testid="icon-layers" {...props} />
  ),
  FlaskConical: (props: Record<string, unknown>) => (
    <span data-testid="icon-flask" {...props} />
  ),
  ChevronRight: (props: Record<string, unknown>) => (
    <span data-testid="icon-chevron-right" {...props} />
  ),
}));

const mockDomain: DomainData = {
  number: 2,
  name: "Understanding & Using APIs",
  slug: "apis",
  weight: 20,
  progress: 65,
  stats: {
    objectivesCompleted: 9,
    objectivesTotal: 14,
    flashcardsDue: 5,
    labsDone: 4,
    labsTotal: 6,
  },
};

describe("DomainCard", () => {
  it("renders the domain name and weight badge", () => {
    render(<DomainCard domain={mockDomain} />);

    expect(screen.getByText("Understanding & Using APIs")).toBeInTheDocument();
    // Weight may appear in multiple places
    const weightElements = screen.getAllByText("20%");
    expect(weightElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the progress percentage", () => {
    render(<DomainCard domain={mockDomain} />);

    const progressElements = screen.getAllByText("65%");
    expect(progressElements.length).toBeGreaterThanOrEqual(1);
    const progressLabels = screen.getAllByText("Progress");
    expect(progressLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("renders stats for objectives, flashcards, and labs", () => {
    render(<DomainCard domain={mockDomain} />);

    const objElements = screen.getAllByText("9/14");
    expect(objElements.length).toBeGreaterThanOrEqual(1);
    const dueElements = screen.getAllByText("5 due");
    expect(dueElements.length).toBeGreaterThanOrEqual(1);
    const labElements = screen.getAllByText("4/6");
    expect(labElements.length).toBeGreaterThanOrEqual(1);
  });

  it("links to the correct study path", () => {
    render(<DomainCard domain={mockDomain} />);

    const links = screen.getAllByRole("link");
    const studyLink = links.find(
      (el) => el.getAttribute("href") === "/dashboard/study/apis"
    );
    expect(studyLink).toBeDefined();
  });

  it("displays the domain number", () => {
    render(<DomainCard domain={mockDomain} />);

    const numberElements = screen.getAllByText("2");
    expect(numberElements.length).toBeGreaterThanOrEqual(1);
  });
});
