import { useState } from 'react';

import {
    DatePicker,
    DateTimePicker,
    FileUpload,
    Input,
    PasswordEyeInput,
    Select,
} from '@/components/forms';
import { ExampleModal } from '@/components/modals/ExampleModal/ExampleModal';
import {
    Button,
    Card,
    CardTitle,
    Paginator,
    Spinner,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableColumn,
    ThemeToggle,
} from '@/components/ui';
import { useModalStore } from '@/stores';

import styles from './Home.module.css';

/**
 * Internal component gallery (Storybook-lite). Routed at `/components` for
 * the design system review; not linked from the storefront. Useful when
 * iterating on the UI kit without a Storybook dependency.
 */
export function Home() {
    const openModal = useModalStore((s) => s.openModal);

    // State for form components showcase
    const [textInput, setTextInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [textareaInput, setTextareaInput] = useState('');
    const [insideLabelInput, setInsideLabelInput] = useState('');
    const [outsideLeftInput, setOutsideLeftInput] = useState('');
    const [selectValue, setSelectValue] = useState('option1');
    const [dateValue, setDateValue] = useState<Date | null>(null);
    const [dateTimeValue, setDateTimeValue] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    // State for other components
    const [currentPage, setCurrentPage] = useState(1);

    // Sample data for components
    const selectOptions = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' },
    ];

    const tableData = [
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Moderator' },
    ];

    const handleOpenModal = () => {
        openModal(
            <ExampleModal
                title="Welcome!"
                message="This is an example modal using the modal store."
            />,
        );
    };

    return (
        <div className={styles.container}>
            {/* Header Section */}
            <section className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>React-Vite Project Template</h1>
                    <p className={styles.subtitle}>Explore all available UI components</p>
                    <div className={styles.headerControls}>
                        <ThemeToggle size="lg" />
                    </div>
                </div>
            </section>

            {/* Button Components Section */}
            <section className={styles.section}>
                <Card className={styles.showcaseCard}>
                    <CardTitle>Button Components</CardTitle>
                    <div className={styles.componentGrid}>
                        <div className={styles.componentGroup}>
                            <h4>Variants</h4>
                            <div className={styles.buttonGroup}>
                                <Button variant="primary">Primary</Button>
                                <Button variant="secondary">Secondary</Button>
                                <Button variant="danger">Danger</Button>
                                <Button variant="warning">Warning</Button>
                                <Button variant="info">Info</Button>
                                <Button variant="success">Success</Button>
                            </div>
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Sizes</h4>
                            <div className={styles.buttonGroup}>
                                <Button size="sm">Small</Button>
                                <Button size="md">Medium</Button>
                                <Button size="lg">Large</Button>
                                <Button size="xl">Extra Large</Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Input Variants Section */}
            <section className={styles.section}>
                <Card className={styles.showcaseCard}>
                    <CardTitle>Input - Variants</CardTitle>
                    <div className={styles.componentGrid}>
                        <div className={styles.componentGroup}>
                            <h4>Flat</h4>
                            <Input
                                name="input-flat"
                                label="Flat Input"
                                value={textInput}
                                setValue={setTextInput}
                                placeholder="Flat variant"
                                variant="flat"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Bordered</h4>
                            <Input
                                name="input-bordered"
                                label="Bordered Input"
                                value={textInput}
                                setValue={setTextInput}
                                placeholder="Bordered variant"
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Faded</h4>
                            <Input
                                name="input-faded"
                                label="Faded Input"
                                value={textInput}
                                setValue={setTextInput}
                                placeholder="Faded variant"
                                variant="faded"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Underlined</h4>
                            <Input
                                name="input-underlined"
                                label="Underlined Input"
                                value={textInput}
                                setValue={setTextInput}
                                placeholder="Underlined variant"
                                variant="underlined"
                            />
                        </div>
                    </div>
                </Card>
            </section>

            {/* Input Colors Section */}
            <section className={styles.section}>
                <Card className={styles.showcaseCard}>
                    <CardTitle>Input - Colors</CardTitle>
                    <div className={styles.componentGrid}>
                        <div className={styles.componentGroup}>
                            <Input
                                name="input-default"
                                label="Default"
                                value=""
                                setValue={() => {}}
                                placeholder="Default color"
                                color="default"
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <Input
                                name="input-primary"
                                label="Primary"
                                value=""
                                setValue={() => {}}
                                placeholder="Primary color"
                                color="primary"
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <Input
                                name="input-secondary"
                                label="Secondary"
                                value=""
                                setValue={() => {}}
                                placeholder="Secondary color"
                                color="secondary"
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <Input
                                name="input-success"
                                label="Success"
                                value=""
                                setValue={() => {}}
                                placeholder="Success color"
                                color="success"
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <Input
                                name="input-warning"
                                label="Warning"
                                value=""
                                setValue={() => {}}
                                placeholder="Warning color"
                                color="warning"
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <Input
                                name="input-danger"
                                label="Danger"
                                value=""
                                setValue={() => {}}
                                placeholder="Danger color"
                                color="danger"
                                variant="bordered"
                            />
                        </div>
                    </div>
                </Card>
            </section>

            {/* Input Sizes & Radius Section */}
            <section className={styles.section}>
                <Card className={styles.showcaseCard}>
                    <CardTitle>Input - Sizes & Radius</CardTitle>
                    <div className={styles.formGrid}>
                        <div className={styles.formColumn}>
                            <h4>Sizes</h4>
                            <Input
                                name="input-sm"
                                label="Small"
                                value=""
                                setValue={() => {}}
                                placeholder="Small size"
                                size="sm"
                                variant="bordered"
                            />
                            <Input
                                name="input-md"
                                label="Medium"
                                value=""
                                setValue={() => {}}
                                placeholder="Medium size"
                                size="md"
                                variant="bordered"
                            />
                            <Input
                                name="input-lg"
                                label="Large"
                                value=""
                                setValue={() => {}}
                                placeholder="Large size"
                                size="lg"
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.formColumn}>
                            <h4>Border Radius</h4>
                            <Input
                                name="input-radius-none"
                                label="None"
                                value=""
                                setValue={() => {}}
                                placeholder="No radius"
                                radius="none"
                                variant="bordered"
                            />
                            <Input
                                name="input-radius-sm"
                                label="Small Radius"
                                value=""
                                setValue={() => {}}
                                placeholder="Small radius"
                                radius="sm"
                                variant="bordered"
                            />
                            <Input
                                name="input-radius-lg"
                                label="Large Radius"
                                value=""
                                setValue={() => {}}
                                placeholder="Large radius"
                                radius="lg"
                                variant="bordered"
                            />
                            <Input
                                name="input-radius-full"
                                label="Full Radius"
                                value=""
                                setValue={() => {}}
                                placeholder="Full radius"
                                radius="full"
                                variant="bordered"
                            />
                        </div>
                    </div>
                </Card>
            </section>

            {/* Input States & Features Section */}
            <section className={styles.section}>
                <Card className={styles.showcaseCard}>
                    <CardTitle>Input - States & Features</CardTitle>
                    <div className={styles.componentGrid}>
                        <div className={styles.componentGroup}>
                            <h4>Required</h4>
                            <Input
                                name="input-required"
                                label="Required Field"
                                value=""
                                setValue={() => {}}
                                placeholder="This is required"
                                isRequired
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Disabled</h4>
                            <Input
                                name="input-disabled"
                                label="Disabled Field"
                                value="Disabled value"
                                setValue={() => {}}
                                placeholder="Placeholder"
                                isDisabled
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Read Only</h4>
                            <Input
                                name="input-readonly"
                                label="Read Only"
                                value="Read only value"
                                setValue={() => {}}
                                placeholder="Placeholder"
                                isReadOnly
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>With Error</h4>
                            <Input
                                name="input-error"
                                label="Error State"
                                value=""
                                setValue={() => {}}
                                placeholder="Invalid input"
                                errorMessage="This field has an error"
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Clearable</h4>
                            <Input
                                name="input-clearable"
                                label="Clearable"
                                value={textInput}
                                setValue={setTextInput}
                                placeholder="Type to see clear button"
                                isClearable
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Password</h4>
                            <PasswordEyeInput
                                name="password-input"
                                label="Password"
                                value={passwordInput}
                                setValue={setPasswordInput}
                                placeholder="Enter password"
                            />
                        </div>
                    </div>
                </Card>
            </section>

            {/* Input Label Placements & Multiline Section */}
            <section className={styles.section}>
                <Card className={styles.showcaseCard}>
                    <CardTitle>Input - Label Placements & Multiline</CardTitle>
                    <div className={styles.formGrid}>
                        <div className={styles.formColumn}>
                            <h4>Label Placements</h4>
                            <Input
                                name="input-label-outside"
                                label="Outside (default)"
                                value=""
                                setValue={() => {}}
                                placeholder="Label outside"
                                labelPlacement="outside"
                                variant="bordered"
                            />
                            <Input
                                name="input-label-inside"
                                label="Inside"
                                value={insideLabelInput}
                                setValue={setInsideLabelInput}
                                placeholder="Label inside"
                                labelPlacement="inside"
                                variant="bordered"
                            />
                            <Input
                                name="input-label-left"
                                label="Outside Left"
                                value={outsideLeftInput}
                                setValue={setOutsideLeftInput}
                                placeholder="Label left"
                                labelPlacement="outside-left"
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.formColumn}>
                            <h4>Multiline (Textarea)</h4>
                            <Input
                                name="textarea-input"
                                label="Text Area"
                                value={textareaInput}
                                setValue={setTextareaInput}
                                placeholder="Enter multiple lines of text..."
                                multiline
                                rows={4}
                                variant="bordered"
                            />
                        </div>
                    </div>
                </Card>
            </section>

            {/* Select Component Section */}
            <section className={styles.section}>
                <Card className={styles.showcaseCard}>
                    <CardTitle>Select - Variations</CardTitle>
                    <div className={styles.componentGrid}>
                        <div className={styles.componentGroup}>
                            <h4>Default</h4>
                            <Select
                                label="Select Option"
                                placeholder="Choose..."
                                value={selectValue}
                                onChange={(e) => setSelectValue(e.target.value)}
                                options={selectOptions}
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Required</h4>
                            <Select
                                label="Required Select"
                                placeholder="Choose..."
                                value=""
                                onChange={() => {}}
                                options={selectOptions}
                                required
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Disabled</h4>
                            <Select
                                label="Disabled Select"
                                placeholder="Choose..."
                                value="option1"
                                onChange={() => {}}
                                options={selectOptions}
                                disabled
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>With Error</h4>
                            <Select
                                label="Error Select"
                                placeholder="Choose..."
                                value=""
                                onChange={() => {}}
                                options={selectOptions}
                                error="Please select an option"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Small Size</h4>
                            <Select
                                label="Small"
                                placeholder="Choose..."
                                value=""
                                onChange={() => {}}
                                options={selectOptions}
                                size="sm"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Large Size</h4>
                            <Select
                                label="Large"
                                placeholder="Choose..."
                                value=""
                                onChange={() => {}}
                                options={selectOptions}
                                size="lg"
                            />
                        </div>
                    </div>
                </Card>
            </section>

            {/* DatePicker Component Section */}
            <section className={styles.section}>
                <Card className={styles.showcaseCard}>
                    <CardTitle>DatePicker - Variations</CardTitle>
                    <div className={styles.componentGrid}>
                        <div className={styles.componentGroup}>
                            <h4>Default</h4>
                            <DatePicker
                                label="Select Date"
                                value={dateValue}
                                onChange={setDateValue}
                                placeholderText="Pick a date"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Required</h4>
                            <DatePicker
                                label="Required Date"
                                value={null}
                                onChange={() => {}}
                                placeholderText="Required"
                                required
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Disabled</h4>
                            <DatePicker
                                label="Disabled"
                                value={new Date()}
                                onChange={() => {}}
                                disabled
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>With Error</h4>
                            <DatePicker
                                label="Error State"
                                value={null}
                                onChange={() => {}}
                                placeholderText="Invalid"
                                error="Please select a valid date"
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>With Min/Max</h4>
                            <DatePicker
                                label="Limited Range"
                                value={null}
                                onChange={() => {}}
                                placeholderText="Next 30 days only"
                                minDate={new Date()}
                                maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                            />
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Small Size</h4>
                            <DatePicker
                                label="Small"
                                value={null}
                                onChange={() => {}}
                                placeholderText="Small"
                                size="sm"
                            />
                        </div>
                    </div>
                </Card>
            </section>

            {/* DateTime & FileUpload Section */}
            <section className={styles.section}>
                <Card className={styles.showcaseCard}>
                    <CardTitle>DateTime & FileUpload</CardTitle>
                    <div className={styles.formGrid}>
                        <div className={styles.formColumn}>
                            <h4>DateTime Picker</h4>
                            <DateTimePicker
                                name="datetime-default"
                                label="Date & Time"
                                value={dateTimeValue}
                                setValue={setDateTimeValue}
                                variant="bordered"
                            />
                        </div>
                        <div className={styles.formColumn}>
                            <h4>File Upload</h4>
                            <FileUpload
                                name="file-upload"
                                label="Upload File"
                                file={uploadedFile}
                                setFile={setUploadedFile}
                                accept=".pdf,.doc,.docx,image/*"
                                maxSizeMB={5}
                                description="PDF, DOC, or images up to 5MB"
                            />
                            <FileUpload
                                name="file-upload-disabled"
                                label="Disabled Upload"
                                file={null}
                                setFile={() => {}}
                                isDisabled
                                description="This upload is disabled"
                            />
                            <FileUpload
                                name="file-upload-required"
                                label="Required Upload"
                                file={null}
                                setFile={() => {}}
                                isRequired
                                description="This field is required"
                            />
                        </div>
                    </div>
                </Card>
            </section>

            {/* Data Display Components */}
            <section className={styles.section}>
                <Card className={styles.showcaseCard}>
                    <CardTitle>Data Components</CardTitle>
                    <div className={styles.componentGrid}>
                        <div className={styles.componentGroup}>
                            <h4>Modal</h4>
                            <Button variant="primary" onClick={handleOpenModal}>
                                Open Modal
                            </Button>
                        </div>
                        <div className={styles.componentGroup}>
                            <h4>Spinner</h4>
                            <div className={styles.spinnerGroup}>
                                <Spinner variant="primary" size="sm" />
                                <Spinner variant="primary" size="md" />
                                <Spinner variant="primary" size="lg" />
                                <Spinner variant="secondary" size="md" />
                            </div>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Table Component */}
            <section className={styles.section}>
                <Card className={styles.showcaseCard}>
                    <CardTitle>Table Component</CardTitle>
                    <Table aria-label="Sample data table" radius={8}>
                        <TableHeader>
                            <TableColumn>ID</TableColumn>
                            <TableColumn>Name</TableColumn>
                            <TableColumn>Email</TableColumn>
                            <TableColumn>Role</TableColumn>
                        </TableHeader>
                        <TableBody>
                            {tableData.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.id}</TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.email}</TableCell>
                                    <TableCell>{row.role}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </section>

            {/* Paginator Component */}
            <section className={styles.section}>
                <Card className={styles.showcaseCard}>
                    <CardTitle>Paginator Component</CardTitle>
                    <div className={styles.componentGroup}>
                        <Paginator
                            page={currentPage}
                            numPages={10}
                            onPageChange={setCurrentPage}
                            size="md"
                            variant="rounded"
                            showEdges
                        />
                        <p className={styles.currentPage}>Current Page: {currentPage}</p>
                    </div>
                </Card>
            </section>
        </div>
    );
}
