import type React from 'react';

import styles from './TableCell.module.css';

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableDataCellElement> {
    children: React.ReactNode;
}

/**
 * A single cell (<td>) within the table body row.
 */
export const TableCell: React.FC<TableCellProps> = ({ children, ...props }) => {
    return (
        <td className={styles.cell} {...props}>
            {children}
        </td>
    );
};
