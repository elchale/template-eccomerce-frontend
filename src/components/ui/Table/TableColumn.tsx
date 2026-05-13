import type React from 'react';

import styles from './TableColumn.module.css';

export interface TableColumnProps extends React.ThHTMLAttributes<HTMLTableHeaderCellElement> {
    children: React.ReactNode;
}

/**
 * A TableColumn is effectively a <th>.
 * Typically used only inside <TableHeader>.
 */
export const TableColumn: React.FC<TableColumnProps> = ({ children, ...props }) => {
    return (
        <th className={styles.column} {...props}>
            {children}
        </th>
    );
};
