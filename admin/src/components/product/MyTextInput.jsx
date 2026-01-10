import { Alert, AlertIcon, Box, FormLabel, Input } from "@chakra-ui/react";
import { useField } from "formik";

const MyTextInput = ({ label, ...props }) => {
    const [field, meta] = useField(props);
    return (
        <Box>
        <FormLabel htmlFor={props.id || props.name}>{label}</FormLabel>
        <div style={{ display: 'flex', justifyItems: 'center', alignItems: 'center', gap: '1rem' }}>
            <Input {...field} {...props} />
        </div>
        {meta.touched && meta.error ? (
            <Alert className="error" status={"error"} mt={2} rounded="md">
            <AlertIcon />
            {meta.error}
            </Alert>
        ) : null}
        </Box>
    );
};


export default MyTextInput;