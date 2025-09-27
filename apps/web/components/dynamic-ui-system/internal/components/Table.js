"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IconButton, Row } from ".";
import { useState } from "react";
import styles from "./Table.module.scss";
function Table({ data, onRowClick, ...flex }) {
  const [sortConfig, setSortConfig] = useState(null);
  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === "ascending"
        ? "descending"
        : "ascending";
    }
    setSortConfig({ key, direction });
  };
  const sortedRows = [...data.rows].sort((a, b) => {
    if (!sortConfig) {
      return 0;
    }
    const headerIndex = data.headers.findIndex((header) =>
      header.key === sortConfig.key
    );
    if (headerIndex === -1) {
      return 0;
    }
    const aValue = String(a[headerIndex]);
    const bValue = String(b[headerIndex]);
    if (sortConfig.direction === "ascending") {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });
  const headers = data.headers.map((header, index) => (_jsx("th", {
    style: {
      textAlign: "left",
      borderBottom: "1px solid var(--neutral-alpha-weak)",
    },
    className: "px-16 py-12 font-label font-default font-s",
    children: _jsxs(Row, {
      gap: "8",
      vertical: "center",
      children: [
        header.content,
        header.sortable &&
        (_jsx(IconButton, {
          icon: sortConfig?.key === header.key
            ? sortConfig.direction === "ascending" ? "chevronUp" : "chevronDown"
            : "chevronDown",
          size: "s",
          variant: "ghost",
          onClick: (e) => {
            e.stopPropagation();
            handleSort(header.key);
          },
          style: {
            opacity: sortConfig?.key === header.key ? 1 : 0.6,
          },
        })),
      ],
    }),
  }, index)));
  const rows = (sortConfig ? sortedRows : data.rows).map((
    row,
    index,
  ) => (_jsx("tr", {
    onClick: onRowClick ? () => onRowClick(index) : undefined,
    className: onRowClick ? "cursor-interactive " + styles.hover : "",
    style: onRowClick
      ? { transition: "background-color 0.2s ease" }
      : undefined,
    children: row.map((
      cell,
      cellIndex,
    ) => (_jsx("td", {
      className: "px-16 py-12 font-body font-default font-s",
      children: cell,
    }, cellIndex))),
  }, index)));
  return (_jsx(Row, {
    fillWidth: true,
    radius: "l",
    overflowY: "hidden",
    border: "neutral-alpha-weak",
    background: "surface",
    overflowX: "auto",
    marginTop: "8",
    marginBottom: "16",
    ...flex,
    children: _jsxs("table", {
      className: "fill-width",
      style: {
        borderSpacing: 0,
        borderCollapse: "collapse",
        minWidth: "32rem",
      },
      children: [
        _jsx("thead", {
          className: "neutral-on-background-strong",
          children: _jsx("tr", { children: headers }),
        }),
        _jsx("tbody", {
          className: "neutral-on-background-medium",
          children: rows.length > 0 ? rows : (_jsx("tr", {
            children: _jsx("td", {
              colSpan: headers.length,
              className: "px-24 py-12 font-body font-default font-s",
              children: "No data available",
            }),
          })),
        }),
      ],
    }),
  }));
}
export { Table };
//# sourceMappingURL=Table.js.map
