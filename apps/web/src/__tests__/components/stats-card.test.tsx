import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsCard } from "@/components/dashboard/stats-card";

// Mock lucide-react to provide a simple component for any icon
vi.mock("lucide-react", () => {
  const MockIcon = (props: Record<string, unknown>) => (
    <span data-testid="mock-icon" {...props} />
  );
  return {
    Target: MockIcon,
    Flame: MockIcon,
    Trophy: MockIcon,
    Clock: MockIcon,
  };
});

// Import after mock so we get the mocked version
import { Target, Flame } from "lucide-react";

describe("StatsCard", () => {
  it("renders the label and value", () => {
    render(<StatsCard icon={Target} label="Overall Progress" value="48%" />);

    expect(screen.getByText("Overall Progress")).toBeInTheDocument();
    expect(screen.getByText("48%")).toBeInTheDocument();
  });

  it("shows trend indicator when provided", () => {
    render(
      <StatsCard
        icon={Target}
        label="Overall Progress"
        value="48%"
        trend={{ value: "5%", positive: true }}
      />
    );

    // Positive trend shows the + prefix
    expect(screen.getByText("+5%")).toBeInTheDocument();
  });

  it("shows negative trend without plus prefix", () => {
    render(
      <StatsCard
        icon={Target}
        label="Score"
        value="72%"
        trend={{ value: "3%", positive: false }}
      />
    );

    expect(screen.getByText("3%")).toBeInTheDocument();
  });

  it("does not render trend indicator when not provided", () => {
    const { container } = render(
      <StatsCard icon={Flame} label="Study Streak" value="7 days" />
    );

    // There should be no element with the trend classes
    const trendElements = container.querySelectorAll(
      ".text-emerald-400, .text-red-400"
    );
    expect(trendElements).toHaveLength(0);
  });

  it("renders the icon", () => {
    render(<StatsCard icon={Target} label="Progress" value="50%" />);

    // Multiple mock-icon elements may exist (icon in card), just check at least one
    const icons = screen.getAllByTestId("mock-icon");
    expect(icons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders with a numeric value", () => {
    render(<StatsCard icon={Target} label="Questions" value={42} />);

    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
