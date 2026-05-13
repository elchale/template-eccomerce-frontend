import React from 'react';

import { TableContext } from './TableContext';
import styles from './TableRow.module.css';

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    children: React.ReactNode;
    selected?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({ children, selected, className, ...rest }) => {
    const { radius } = React.useContext(TableContext);

    const style =
        radius !== undefined
            ? ({
                  '--table-radius': `${radius}px`,
              } as React.CSSProperties)
            : undefined;

    return (
        <tr
            className={`${styles.row} ${selected ? styles.selected : ''} ${className || ''}`.trim()}
            style={style}
            {...rest}
        >
            {children}
        </tr>
    );
};
