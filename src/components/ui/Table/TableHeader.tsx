import React, { useEffect } from 'react';

import { TableContext } from './TableContext';
import styles from './TableHeader.module.css';

/** We treat TableHeader as a single row of columns by default. */
export interface TableHeaderProps {
    children: React.ReactNode;
}

/**
 * The TableHeader is rendered as a `<thead>` with a single `<tr>`
 * containing TableColumn cells.
 */
export const TableHeader: React.FC<TableHeaderProps> = ({ children }) => {
    const { setColumnCount, radius } = React.useContext(TableContext);
    const columns = React.Children.count(children);

    useEffect(() => {
        setColumnCount(columns);
    }, [columns, setColumnCount]);

    const style =
        radius !== undefined
            ? ({
                  '--table-radius': `${radius}px`,
              } as React.CSSProperties)
            : undefined;

    return (
        <thead className={styles.header}>
            <tr className={styles.row} style={style}>
                {children}
            </tr>
        </thead>
    );
};
