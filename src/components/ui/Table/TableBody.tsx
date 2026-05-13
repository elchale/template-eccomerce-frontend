import React, { useRef, useEffect, useState } from 'react';

import styles from './TableBody.module.css';
import { TableContext } from './TableContext';

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
    children: React.ReactNode;
    isLoading?: boolean;
    spinner?: React.ReactNode;
    noDataMessage?: React.ReactNode;
}

/**
 * TableBody automatically shows:
 * - A loading spinner row if `isLoading` is true.
 * - A no-data message row if there are zero children (and not loading).
 * Otherwise it renders all given <TableRow> children.
 */
export const TableBody: React.FC<TableBodyProps> = ({
    children,
    isLoading = false,
    spinner,
    noDataMessage = 'No data found',
    ...props
}) => {
    const rows = React.Children.toArray(children).filter(Boolean);
    const { columnCount } = React.useContext(TableContext);
    const [lastContentHeight, setLastContentHeight] = useState<number>(0);
    const bodyRef = useRef<HTMLTableSectionElement>(null);

    useEffect(() => {
        if (bodyRef.current && rows.length > 0) {
            const height = bodyRef.current.offsetHeight;
            if (height > 0) {
                setLastContentHeight(height);
            }
        }
    }, [rows]);

    if (isLoading || rows.length === 0) {
        return (
            <tbody {...props}>
                <tr>
                    <td
                        colSpan={columnCount}
                        className={isLoading ? styles.loading : styles.empty}
                        style={lastContentHeight ? { height: lastContentHeight } : undefined}
                    >
                        <div>{isLoading ? spinner || 'Loading...' : noDataMessage}</div>
                    </td>
                </tr>
            </tbody>
        );
    }

    return (
        <tbody ref={bodyRef} {...props}>
            {children}
        </tbody>
    );
};
