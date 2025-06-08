import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Text,
  Image,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FaTrash, FaEdit } from "react-icons/fa";
import supabaseClient from "../services/supabaseClient";

interface AdminTableProps {
  tableName: string;
  columns?: string[];
  onEdit?: (data: any) => void;
  onDelete?: (id: number) => void;
}

const AdminTable = ({
  tableName,
  columns,
  onEdit,
  onDelete,
}: AdminTableProps) => {
  const bgHeader = useColorModeValue("gray.100", "gray.800"); // <-- Move hook here
  const [data, setData] = useState<any[]>([]);
  const [columnNames, setColumnNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      let orderField = "label";
      if (tableName === "restaurants") orderField = "name";
      else if (tableName === "waiting_list") orderField = "email";

      const query = supabaseClient
        .from(tableName)
        .select(columns?.join(",") || "*")
        .order(orderField);

      const { data, error } = await query;

      if (error) {
        setError(error.message);
        setData([]);
      } else {
        setData(data ?? []);
        if (data && data.length > 0) {
          setColumnNames(columns ?? Object.keys(data[0]));
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [tableName, columns]);

  if (loading) return <Spinner />;
  if (error) return <Text color="red.500">Erreur : {error}</Text>;
  if (data.length === 0)
    return (
      <Text color="gray.500">Aucune donnée dans la table "{tableName}"</Text>
    );

  const visibleColumns = columnNames.filter((col) => col !== "id");

  return (
    <Box borderWidth="1px" borderRadius="md" overflow="auto">
      <Table variant="striped" size="sm">
        <Thead
          position="sticky"
          top={0}
          zIndex={1}
          bg={bgHeader} // use the stored variable here
        >
          <Tr>
            {visibleColumns.map((col) => (
              <Th key={col}>{col}</Th>
            ))}
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.map((row, idx) => (
            <Tr key={idx}>
              {visibleColumns.map((col) => {
                const value = row[col];
                const isImage =
                  typeof value === "string" &&
                  (value.startsWith("http") || value.startsWith("/")) &&
                  col.toLowerCase().includes("image");

                return (
                  <Td key={col}>
                    {isImage ? (
                      <Image
                        src={value}
                        alt={col}
                        boxSize="40px"
                        objectFit="cover"
                        borderRadius="md"
                      />
                    ) : (
                      String(value)
                    )}
                  </Td>
                );
              })}
              <Td>
                <IconButton
                  aria-label="Modifier"
                  icon={<FaEdit />}
                  size="sm"
                  mr={2}
                  onClick={() => onEdit?.(row)}
                />
                <IconButton
                  aria-label="Supprimer"
                  icon={<FaTrash />}
                  size="sm"
                  colorScheme="red"
                  onClick={() => onDelete?.(row.id)}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default AdminTable;
