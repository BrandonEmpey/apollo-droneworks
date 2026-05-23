import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EmployeeForm from "../payroll/employee-form";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: vi.fn(),
}));

const mockDepartments = [
  { id: 1, name: "Operations", description: null, createdAt: "2024-01-01" },
  { id: 2, name: "Engineering", description: null, createdAt: "2024-01-01" },
  { id: 3, name: "Marketing", description: null, createdAt: "2024-01-01" },
];

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("EmployeeForm - dropdown selected-value retention", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(["/api/payroll/departments"], mockDepartments);
  });

  it("payType trigger shows 'Salary' after loading employee with payType='salary'", async () => {
    queryClient.setQueryData(["/api/payroll/employees", 5], {
      id: 5,
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phone: "555-1234",
      position: "Lead Engineer",
      departmentId: 2,
      payType: "salary",
      payRate: 85000,
      hireDate: "2022-06-01",
      isActive: true,
      notes: "",
    });

    render(
      React.createElement(EmployeeForm, { employeeId: 5, onClose: vi.fn() }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        const payTypeCombobox = comboboxes[comboboxes.length - 1];
        expect(payTypeCombobox).toHaveTextContent("Salary");
      },
      { timeout: 3000 }
    );
  });

  it("payType trigger updates when employee data changes (proves value, not defaultValue)", async () => {
    queryClient.setQueryData(["/api/payroll/employees", 6], {
      id: 6,
      firstName: "Bob",
      lastName: "Jones",
      email: "bob@example.com",
      phone: "555-5678",
      position: "Drone Operator",
      departmentId: 1,
      payType: "hourly",
      payRate: 35,
      hireDate: "2023-03-15",
      isActive: true,
      notes: "",
    });

    render(
      React.createElement(EmployeeForm, { employeeId: 6, onClose: vi.fn() }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        const payTypeCombobox = comboboxes[comboboxes.length - 1];
        expect(payTypeCombobox).toHaveTextContent("Hourly");
      },
      { timeout: 3000 }
    );

    act(() => {
      queryClient.setQueryData(["/api/payroll/employees", 6], {
        id: 6,
        firstName: "Bob",
        lastName: "Jones",
        email: "bob@example.com",
        phone: "555-5678",
        position: "Senior Operator",
        departmentId: 1,
        payType: "salary",
        payRate: 55000,
        hireDate: "2023-03-15",
        isActive: true,
        notes: "",
      });
    });

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        const payTypeCombobox = comboboxes[comboboxes.length - 1];
        expect(payTypeCombobox).toHaveTextContent("Salary");
      },
      { timeout: 3000 }
    );
  });

  it("department trigger shows loaded department name after form.reset()", async () => {
    queryClient.setQueryData(["/api/payroll/employees", 7], {
      id: 7,
      firstName: "Alice",
      lastName: "Chen",
      email: "alice@example.com",
      phone: "555-9012",
      position: "Marketing Coordinator",
      departmentId: 3,
      payType: "salary",
      payRate: 55000,
      hireDate: "2023-07-01",
      isActive: true,
      notes: "",
    });

    render(
      React.createElement(EmployeeForm, { employeeId: 7, onClose: vi.fn() }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        const deptCombobox = comboboxes[0];
        expect(deptCombobox).toHaveTextContent("Marketing");
      },
      { timeout: 3000 }
    );
  });

  it("department trigger updates when employee's department changes (proves value, not defaultValue)", async () => {
    queryClient.setQueryData(["/api/payroll/employees", 8], {
      id: 8,
      firstName: "Tom",
      lastName: "Brown",
      email: "tom@example.com",
      phone: "555-3456",
      position: "Manager",
      departmentId: 1,
      payType: "salary",
      payRate: 70000,
      hireDate: "2021-01-10",
      isActive: true,
      notes: "",
    });

    render(
      React.createElement(EmployeeForm, { employeeId: 8, onClose: vi.fn() }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        expect(comboboxes[0]).toHaveTextContent("Operations");
      },
      { timeout: 3000 }
    );

    act(() => {
      queryClient.setQueryData(["/api/payroll/employees", 8], {
        id: 8,
        firstName: "Tom",
        lastName: "Brown",
        email: "tom@example.com",
        phone: "555-3456",
        position: "Engineering Manager",
        departmentId: 2,
        payType: "salary",
        payRate: 75000,
        hireDate: "2021-01-10",
        isActive: true,
        notes: "",
      });
    });

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        expect(comboboxes[0]).toHaveTextContent("Engineering");
      },
      { timeout: 3000 }
    );
  });

  it("new employee form payType trigger defaults to 'Hourly'", async () => {
    render(
      React.createElement(EmployeeForm, { onClose: vi.fn() }),
      { wrapper: makeWrapper(queryClient) }
    );

    await waitFor(
      () => {
        const comboboxes = screen.getAllByRole("combobox");
        const payTypeCombobox = comboboxes[comboboxes.length - 1];
        expect(payTypeCombobox).toHaveTextContent("Hourly");
      },
      { timeout: 3000 }
    );
  });
});
